import { createHash } from 'node:crypto';
import { lstat, open, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { loadOperatorEnv } from './operator-env.mjs';

const model = 'models/gemini-embedding-2';
const dimensions = 768;
// Bump when the embedding input representation changes so unchanged Markdown is re-embedded.
const embeddingRevision = 2;
const maxChunkLength = 1200;
const maxChunks = 100;
const batchSize = 16;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const usage = `Usage:
  npm run knowledge:ingest -- [--dry-run] [--allow-demo] <file-or-directory> ...
  npm run knowledge:ingest -- --allow-demo --prepare <external-json-path> <demo-file-or-directory> ...
  npm run knowledge:ingest -- --retire <document-id>`;

function requirements(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in your environment or .env.local.`);
  return value;
}

function validateId(id) {
  if (!id || id.length > 100 || !idPattern.test(id)) {
    throw new Error('Use an id of up to 100 lowercase letters or digits separated by hyphens.');
  }
}

async function findMarkdown(path) {
  const resolvedPath = await realpath(path);
  if (!(await stat(resolvedPath)).isDirectory()) {
    if (extname(resolvedPath).toLowerCase() !== '.md') throw new Error(`Expected a Markdown file at ${path}.`);
    return [resolvedPath];
  }

  const entries = await readdir(resolvedPath, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const entryPath = join(resolvedPath, entry.name);
    if (entry.isDirectory()) paths.push(...await findMarkdown(entryPath));
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') paths.push(entryPath);
  }
  return paths;
}

function readMetadata(header) {
  const fields = new Map();
  for (const line of header.split('\n')) {
    if (!line.trim()) continue;
    const match = /^(id|title|category|source_url):\s*(\S.*)$/.exec(line.trim());
    if (!match || fields.has(match[1])) throw new Error('Use one plain `key: value` line each for id, title, optional category, and source_url.');
    fields.set(match[1], match[2]);
  }

  const id = fields.get('id');
  const title = fields.get('title');
  const category = fields.get('category');
  validateId(id);
  if (id.startsWith('eval-')) throw new Error(`${id} is evaluation-only and cannot be ingested.`);
  if (!title || [...title].length > 200) throw new Error('Use a title between 1 and 200 characters.');
  if (category && [...category].length > 100) throw new Error('Use a category of at most 100 characters.');

  const source = fields.get('source_url');
  const sourceUrl = source && URL.canParse(source) ? new URL(source) : null;
  if (!sourceUrl || sourceUrl.protocol !== 'https:' || sourceUrl.username || sourceUrl.password || sourceUrl.href.length > 2048) {
    throw new Error('Use a valid HTTPS source_url without credentials and at most 2048 characters.');
  }
  if (id.startsWith('demo-') && sourceUrl.href !== `https://careflow.example/knowledge/${id}`) {
    throw new Error('Demo documents must use their canonical CareFlow reserved source_url.');
  }
  if (!id.startsWith('demo-') && sourceUrl.hostname === 'careflow.example') {
    throw new Error('The CareFlow reserved source_url is only valid for demo documents.');
  }
  return { id, title, ...(category ? { category } : {}), sourceUrl: sourceUrl.href };
}

function splitParagraph(paragraph) {
  const characters = [...paragraph];
  const pieces = [];
  let start = 0;
  while (start < characters.length) {
    let end = Math.min(start + maxChunkLength, characters.length);
    if (end < characters.length) {
      // Prefer a word boundary near the limit, including in a long list or table.
      const earliestBreak = start + Math.floor(maxChunkLength * 0.7);
      for (let index = end; index > earliestBreak; index -= 1) {
        if (/\s/u.test(characters[index])) {
          end = index;
          break;
        }
      }
    }
    const piece = characters.slice(start, end).join('').trim();
    if (piece) pieces.push(piece);
    start = end;
  }
  return pieces;
}

function chunkMarkdown(markdown) {
  const chunks = [];
  const headings = [];
  let section = [];
  let fence;

  function flushSection() {
    const heading = headings.map(({ text }) => text).join(' / ');
    if ([...heading].length > 300) throw new Error('Shorten the heading hierarchy to 300 characters.');

    let content = '';
    let length = 0;
    for (const paragraph of section.join('\n').trim().split(/\n[ \t]*\n/u)) {
      for (const piece of splitParagraph(paragraph)) {
        const pieceLength = [...piece].length;
        if (content && length + 2 + pieceLength > maxChunkLength) {
          chunks.push({ heading: heading || null, content });
          content = '';
          length = 0;
        }
        if (content) {
          content += '\n\n';
          length += 2;
        }
        content += piece;
        length += pieceLength;
      }
    }
    if (content) chunks.push({ heading: heading || null, content });
    section = [];
  }

  for (const line of markdown.split('\n')) {
    const fenceMarker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (fenceMarker && fenceMarker[1][0] === fence[0] && fenceMarker[1].length >= fence.length && !fenceMarker[2].trim()) {
        fence = undefined;
      }
      section.push(line);
      continue;
    }
    if (fenceMarker) {
      fence = fenceMarker[1];
      section.push(line);
      continue;
    }

    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) {
      section.push(line);
      continue;
    }
    flushSection();
    const level = heading[1].length;
    while (headings.at(-1)?.level >= level) headings.pop();
    headings.push({ level, text: heading[2].trim() });
  }

  flushSection();
  if (!chunks.length || chunks.length > maxChunks) {
    throw new Error(`Use Markdown with 1–${maxChunks} chunks per document. Split longer sources into separately identified documents.`);
  }
  return chunks;
}

function embeddingText(content) {
  // Keep the published chunk intact for retrieval citations; omit only the repeated
  // portfolio disclaimer paragraph from Gemini's embedding input.
  return content.replace(/^\*\*(?:Fictional demo content|Portfolio disclaimer):\*\*[\s\S]*?(?=\n\s*\n|$)\s*/gmu, '').trim();
}

async function loadDocument(path) {
  try {
    const input = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)).replace(/\r\n?/g, '\n');
    if (input.includes('\0')) throw new Error('Remove null characters from the Markdown.');
    const frontMatter = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n/.exec(input);
    if (!frontMatter) throw new Error('Add id, title, and source_url front matter before the content.');

    const metadata = readMetadata(frontMatter[1]);
    const chunks = chunkMarkdown(input.slice(frontMatter[0].length));
    const hash = createHash('sha256')
      .update(JSON.stringify({ format: embeddingRevision, model, dimensions, ...metadata, chunks }))
      .digest('hex');
    return { ...metadata, chunks, hash };
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

async function fetchBatch(apiKey, requests) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents`;
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ requests }),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.json();

    await response.body?.cancel();
    if (attempt >= 2 || (response.status !== 429 && response.status < 500)) {
      throw new Error(`Gemini embeddings returned HTTP ${response.status}.`);
    }
    const retryAfter = Number(response.headers.get('retry-after')) * 1000;
    if (retryAfter > 30_000) throw new Error('Gemini is rate-limited. Retry this ingestion after the quota resets.');
    await delay(Math.max(retryAfter || 0, 1000 * 2 ** attempt));
  }
}

async function embedDocument(apiKey, document) {
  const embedded = [];
  for (let offset = 0; offset < document.chunks.length; offset += batchSize) {
    const batch = document.chunks.slice(offset, offset + batchSize);
    const requests = batch.map(({ heading, content }) => {
      const cleanContent = embeddingText(content);
      const section = [heading, cleanContent].filter(Boolean).join('\n');
      const category = document.category ? ` | category: ${document.category}` : '';
      return {
        model,
        content: { parts: [{ text: `title: ${document.title}${category} | text: ${section}` }] },
        outputDimensionality: dimensions,
      };
    });
    const { embeddings } = await fetchBatch(apiKey, requests);
    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      throw new Error('Gemini returned an unexpected number of embeddings.');
    }
    for (const [index, chunk] of batch.entries()) {
      const embedding = embeddings[index]?.values;
      if (!Array.isArray(embedding) || embedding.length !== dimensions ||
          !embedding.every(Number.isFinite) || !embedding.some(value => value !== 0)) {
        throw new Error('Gemini returned an invalid embedding.');
      }
      embedded.push({ ...chunk, embedding });
    }
  }
  return embedded;
}

async function publish(client, apiKey, document) {
  const { data: current, error: lookupError } = await client
    .from('knowledge_documents')
    .select('content_hash, published, revision')
    .eq('id', document.id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (current?.published && current.content_hash === document.hash) return 'unchanged';

  const { data: result, error } = await client.rpc('publish_knowledge_document', {
    target_document_id: document.id,
    document_title: document.title,
    document_source_url: document.sourceUrl,
    document_content_hash: document.hash,
    expected_revision: current?.revision ?? null,
    chunks: await embedDocument(apiKey, document),
  });
  if (error?.code === '40001') throw new Error('Document changed during ingestion. Review the current source before retrying.');
  if (error) throw new Error(error.message);
  return result;
}

function createAdminClient() {
  loadOperatorEnv();
  return createClient(requirements('NEXT_PUBLIC_SUPABASE_URL'), requirements('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'allow-demo': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      prepare: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      retire: { type: 'string' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  if (values.retire !== undefined) {
    if (positionals.length || values['dry-run'] || values['allow-demo'] || values.prepare !== undefined) throw new Error(usage);
    validateId(values.retire);
    const client = createAdminClient();
    const { data, error } = await client.rpc('retire_knowledge_document', { target_document_id: values.retire });
    if (error) throw new Error(error.message);
    if (data === 'missing') throw new Error(`No knowledge document found for ${values.retire}.`);
    console.log(`${values.retire}: ${data}`);
    return;
  }
  if (!positionals.length) throw new Error(usage);

  const paths = new Set((await Promise.all(positionals.map(findMarkdown))).flat().sort());
  if (!paths.size) throw new Error('No Markdown files found.');
  const documents = new Map();
  for (const path of paths) {
    const document = await loadDocument(path);
    if (documents.has(document.id)) throw new Error(`Duplicate knowledge document id: ${document.id}.`);
    if (document.id.startsWith('demo-') && !values['dry-run'] && !values['allow-demo']) {
      throw new Error(`${document.id} is a demo fixture. Use --dry-run to preview it or --allow-demo in a test project.`);
    }
    documents.set(document.id, document);
  }

  if (values.prepare !== undefined) {
    if (values['dry-run'] || !values['allow-demo'] || !values.prepare.trim() || !isAbsolute(values.prepare)) {
      throw new Error('Preparation requires --allow-demo, a destination path, and no --dry-run.');
    }
    if ([...documents.values()].some(document => !document.id.startsWith('demo-'))) {
      throw new Error('Preparation accepts demo- documents only.');
    }
    const requestedDestination = resolve(values.prepare);
    let realParent;
    try {
      realParent = await realpath(join(requestedDestination, '..'));
    } catch {
      throw new Error('Prepared JSON destination must be in an existing directory outside the repository.');
    }
    const destination = join(realParent, basename(requestedDestination));
    const rel = relative(await realpath('.'), destination);
    if (rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))) {
      throw new Error('Prepared JSON must be written outside the repository.');
    }

    try {
      await lstat(destination);
      throw new Error('Prepared JSON destination already exists; refusing to overwrite it.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    loadOperatorEnv();
    const prepared = [];
    for (const document of documents.values()) {
      const chunks = await embedDocument(requirements('GEMINI_API_KEY'), document);
      prepared.push({
        id: document.id,
        title: document.title,
        source_url: document.sourceUrl,
        content_hash: document.hash,
        chunks: chunks.map((chunk, index) => ({ ordinal: index + 1, heading: chunk.heading, content: chunk.content, embedding: chunk.embedding })),
      });
    }
    const output = await open(destination, 'wx');
    try {
      await output.writeFile(`${JSON.stringify({ format: 1, model, dimensions, documents: prepared }, null, 2)}\n`, 'utf8');
    } finally {
      await output.close();
    }
    console.log(`Prepared ${prepared.length} demo document${prepared.length === 1 ? '' : 's'} (${prepared.reduce((sum, document) => sum + document.chunks.length, 0)} chunks).`);
    return;
  }

  if (values['dry-run']) {
    for (const document of documents.values()) console.log(`${document.id}: ${document.chunks.length} chunks`);
    return;
  }

  const client = createAdminClient();
  for (const document of documents.values()) {
    try {
      const result = await publish(client, requirements('GEMINI_API_KEY'), document);
      console.log(`${document.id}: ${result} (${document.chunks.length} chunks)`);
    } catch (error) {
      throw new Error(`${document.id}: ${error.message}`);
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
