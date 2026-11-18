import type { SupabaseClient } from '@supabase/supabase-js';

const embeddingEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent';
const embeddingDimensions = 768;
const maxSources = 4;

type KnowledgeChunk = {
  id: string;
  document_id: string;
  title: string;
  source_url: string;
  heading: string | null;
  content: string;
  similarity: number;
};

export async function searchClinicKnowledge(supabase: SupabaseClient, question: string, callerSignal?: AbortSignal) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Clinic knowledge search is unavailable.');

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error('Clinic knowledge search timed out.')), 8_000);
  const bounded = <T>(operation: PromiseLike<T>) => new Promise<T>((resolve, reject) => {
    const abort = () => reject(controller.signal.reason ?? new Error('Clinic knowledge search cancelled.'));
    if (controller.signal.aborted) abort();
    else controller.signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(operation).then(
      value => { controller.signal.removeEventListener('abort', abort); resolve(value); },
      error => { controller.signal.removeEventListener('abort', abort); reject(error); },
    );
  });
  let embeddingResponse: Response;
  try {
    embeddingResponse = await bounded(fetch(embeddingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: 'models/gemini-embedding-2',
        content: { parts: [{ text: `task: question answering | query: ${question.slice(0, 500)}` }] },
        outputDimensionality: embeddingDimensions,
      }),
      signal: controller.signal,
      cache: 'no-store',
    }));
    if (!embeddingResponse.ok) {
      throw new Error(`Clinic knowledge embedding failed (${embeddingResponse.status}).`);
    }
    const embeddingPayload: unknown = await bounded(embeddingResponse.json());
    const embedding = (embeddingPayload as { embedding?: { values?: unknown } })?.embedding?.values;
    if (!Array.isArray(embedding) || embedding.length !== embeddingDimensions ||
        !embedding.every(value => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error('Clinic knowledge embedding returned an invalid vector.');
    }

    const rpc = supabase.rpc('match_knowledge_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.67,
      match_count: maxSources,
    }).abortSignal(controller.signal);
    const { data, error } = await bounded(rpc);
    if (error) throw new Error('Clinic knowledge search failed.');

    const evidence: string[] = [];
    for (const row of (data ?? []) as KnowledgeChunk[]) {
      if (evidence.length >= maxSources || typeof row?.content !== 'string' || !row.content.trim()) continue;
      const demoSource = /^demo-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.document_id) &&
        row.source_url === `https://careflow.example/knowledge/${row.document_id}`;
      const demoLabel = demoSource ? ' [Fictional demo clinic information; identify it as demo information in any answer.]' : '';
      evidence.push(`${row.content.slice(0, 1200)}${demoLabel}`);
    }

    return { evidence: evidence.join('\n\n') };
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
