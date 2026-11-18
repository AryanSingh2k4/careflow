import { open, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { loadOperatorEnv } from './operator-env.mjs';

const model = 'models/gemini-embedding-2';
const dimensions = 768;
const datasetPath = new URL('../knowledge/evaluation/retrieval-cases.json', import.meta.url);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in the environment or .env.local.`);
  return value;
}

async function embedQuestion(apiKey, question) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:embedContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model,
      content: { parts: [{ text: `task: question answering | query: ${question.slice(0, 500)}` }] },
      outputDimensionality: dimensions,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Gemini query embedding returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const values = payload?.embedding?.values;
  if (!Array.isArray(values) || values.length !== dimensions || !values.every(Number.isFinite)) {
    throw new Error('Gemini returned an invalid query embedding.');
  }
  return values;
}

async function makeClient() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = process.env.EVAL_ACCESS_TOKEN?.trim();
  if (token) {
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  const email = process.env.EVAL_EMAIL?.trim();
  const password = process.env.EVAL_PASSWORD;
  if (!email || !password) {
    throw new Error('Set EVAL_ACCESS_TOKEN or EVAL_EMAIL and EVAL_PASSWORD for an authenticated read-only eval session.');
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Supabase eval sign-in failed: ${error.message}`);
  return client;
}

async function writeNewAbsoluteJson(path, value) {
  if (!isAbsolute(path)) throw new Error('Output paths must be absolute paths outside the repository.');
  const requestedPath = resolve(path);
  const absolutePath = join(await realpath(dirname(requestedPath)), basename(requestedPath));
  const repoPath = await realpath('.');
  const rel = relative(repoPath, absolutePath);
  if (rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))) {
    throw new Error('Prepared query vectors must be written outside the repository.');
  }
  const destination = await open(absolutePath, 'wx');
  try {
    await destination.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  } finally {
    await destination.close();
  }
}

function parseThresholds(value) {
  const thresholds = value.split(',').map(Number);
  if (!thresholds.length || thresholds.some(number => !Number.isFinite(number) || number < -1 || number > 1)) {
    throw new Error('Thresholds must be comma-separated numbers from -1 to 1.');
  }
  return [...new Set(thresholds)].sort((a, b) => a - b);
}

async function retrieve(client, embedding, threshold) {
  const { data, error } = await client.rpc('match_knowledge_chunks', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: 20,
  });
  if (error) throw new Error(`Retrieval RPC failed: ${error.message}`);
  const documentIds = [];
  for (const row of data ?? []) {
    if (typeof row.document_id === 'string' && !documentIds.includes(row.document_id)) documentIds.push(row.document_id);
    if (documentIds.length === 4) break;
  }
  return documentIds;
}

function score(cases, results) {
  const retrievalCases = cases.filter(test => test.expected_source_ids.length > 0);
  const negatives = cases.filter(test => test.expected_source_ids.length === 0);
  let hit = 0;
  let reciprocalRank = 0;
  for (const test of retrievalCases) {
    const rank = results.get(test.id).findIndex(id => test.expected_source_ids.includes(id));
    if (rank >= 0) {
      hit += 1;
      reciprocalRank += 1 / (rank + 1);
    }
  }
  const noMatches = negatives.filter(test => results.get(test.id).length === 0).length;
  const noMatchByKind = Object.fromEntries([...new Set(negatives.map(test => test.kind))].map(kind => {
    const group = negatives.filter(test => test.kind === kind);
    const matchedNone = group.filter(test => results.get(test.id).length === 0).length;
    return [kind, { n: group.length, accuracy: matchedNone / group.length, false_match_count: group.length - matchedNone }];
  }));
  return {
    n_answerable_or_supported: retrievalCases.length,
    hit_at_4: hit / retrievalCases.length,
    mrr: reciprocalRank / retrievalCases.length,
    n_expected_no_match: negatives.length,
    no_match_accuracy: negatives.length ? noMatches / negatives.length : null,
    false_match_count: negatives.length - noMatches,
    no_match_accuracy_by_kind: noMatchByKind,
  };
}

function evaluateAnswers(cases, answerFile) {
  if (answerFile.format !== 1 || !Array.isArray(answerFile.answers)) {
    throw new Error('Answer file must be { format: 1, answers: [{ case_id, answer }] }.');
  }
  const byId = new Map(cases.map(test => [test.id, test]));
  const seen = new Set();
  let totalChecks = 0;
  let passedChecks = 0;
  let totalCases = 0;
  let passedCases = 0;
  let judgedFacts = 0;
  let supportedFacts = 0;
  let judgedCases = 0;
  let allExpectedFactsSupported = 0;
  const checklistByMode = new Map();
  const details = [];
  for (const item of answerFile.answers) {
    if (!byId.has(item.case_id) || typeof item.answer !== 'string' || seen.has(item.case_id)) {
      throw new Error(`Invalid, duplicate, or unknown answer case: ${item.case_id ?? '(missing id)'}.`);
    }
    seen.add(item.case_id);
    const test = byId.get(item.case_id);
    if (item.fact_checks !== undefined) {
      if (!Array.isArray(item.fact_checks) || item.fact_checks.length !== test.expected_facts.length ||
          item.fact_checks.some(value => typeof value !== 'boolean')) {
        throw new Error(`fact_checks for ${test.id} must be booleans aligned with its ${test.expected_facts.length} expected_facts.`);
      }
      if (item.fact_checks.length) {
        judgedCases += 1;
        judgedFacts += item.fact_checks.length;
        supportedFacts += item.fact_checks.filter(Boolean).length;
        if (item.fact_checks.every(Boolean)) allExpectedFactsSupported += 1;
      }
    }
    const criteria = test.answer_check ?? {};
    const mode = criteria.mode ?? 'grounded_answer';
    const normalizedAnswer = item.answer.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
    const checks = [];
    for (const phrase of criteria.must_include ?? []) {
      // Slash-separated alternatives permit simple spelling variants only.
      const alternatives = phrase.split('/').map(part => part.toLocaleLowerCase().replace(/\s+/gu, ' ').trim());
      checks.push({ type: 'must_include', criterion: phrase, pass: alternatives.some(part => normalizedAnswer.includes(part)) });
    }
    for (const phrase of criteria.must_not_claim ?? []) {
      const normalizedPhrase = phrase.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
      checks.push({ type: 'must_not_claim', criterion: phrase, pass: !normalizedAnswer.includes(normalizedPhrase) });
    }
    if (!checks.length) continue;
    if (!checklistByMode.has(mode)) checklistByMode.set(mode, { n_cases: 0, passed_cases: 0, checks_passed: 0, checks_total: 0 });
    const modeMetrics = checklistByMode.get(mode);
    totalCases += 1;
    modeMetrics.n_cases += 1;
    const casePass = checks.every(check => check.pass);
    if (casePass) passedCases += 1;
    if (casePass) modeMetrics.passed_cases += 1;
    totalChecks += checks.length;
    const casePassedChecks = checks.filter(check => check.pass).length;
    passedChecks += casePassedChecks;
    modeMetrics.checks_passed += casePassedChecks;
    modeMetrics.checks_total += checks.length;
    details.push({ case_id: test.id, mode, checks_passed: casePassedChecks, checks_total: checks.length, pass: casePass, checks });
  }
  if (!answerFile.answers.length || !totalChecks) throw new Error('Provide at least one answer with at least one explicit answer_check criterion.');
  return {
    mode: 'deterministic substring checklist; not a semantic or judged answer-accuracy metric',
    supplied_answer_count: answerFile.answers.length,
    evaluated_cases: totalCases,
    case_checklist_pass_rate: totalCases ? passedCases / totalCases : null,
    checklist_checks_passed: passedChecks,
    checklist_checks_total: totalChecks,
    checklist_check_pass_rate: totalChecks ? passedChecks / totalChecks : null,
    checklist_by_mode: Object.fromEntries([...checklistByMode.entries()].map(([mode, stats]) => [mode, {
      ...stats,
      case_pass_rate: stats.n_cases ? stats.passed_cases / stats.n_cases : null,
      check_pass_rate: stats.checks_total ? stats.checks_passed / stats.checks_total : null,
    }])),
    expected_fact_judgement: {
      method: 'human-supplied boolean fact_checks aligned by index to expected_facts; no generated judge is invoked',
      judged_cases: judgedCases,
      facts_supported: supportedFacts,
      facts_judged: judgedFacts,
      expected_fact_coverage: judgedFacts ? supportedFacts / judgedFacts : null,
      all_expected_facts_supported_rate: judgedCases ? allExpectedFactsSupported / judgedCases : null,
    },
    details,
  };
}

function metricsFromResults(cases, resultFile) {
  if (resultFile.format !== 1 || !Array.isArray(resultFile.threshold_sweep)) {
    throw new Error('Results file must be { format: 1, threshold_sweep: [{ threshold, results: [{ case_id, rows }] }] }.');
  }
  const expectedCaseIds = new Set(cases.map(test => test.id));
  return resultFile.threshold_sweep.map(sweep => {
    if (!Number.isFinite(sweep.threshold) || !Array.isArray(sweep.results)) throw new Error('Each threshold entry needs a numeric threshold and results array.');
    const retrieved = new Map();
    for (const entry of sweep.results) {
      if (!expectedCaseIds.has(entry.case_id) || retrieved.has(entry.case_id) || !Array.isArray(entry.rows)) {
        throw new Error(`Invalid, duplicate, or unknown retrieval case: ${entry.case_id ?? '(missing id)'}.`);
      }
      const documents = [];
      for (const row of entry.rows) {
        const documentId = typeof row === 'string' ? row : row?.document_id;
        if (typeof documentId === 'string' && !documents.includes(documentId)) documents.push(documentId);
      }
      retrieved.set(entry.case_id, documents.slice(0, 4));
    }
    if (retrieved.size !== cases.length) throw new Error(`Threshold ${sweep.threshold} has ${retrieved.size} cases; expected ${cases.length}.`);
    return { threshold: sweep.threshold, ...score(cases, retrieved) };
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    thresholds: { type: 'string', default: '0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.67,0.7,0.75,0.8' },
    output: { type: 'string' },
    'prepare-queries': { type: 'string' },
    results: { type: 'string' },
    answers: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log('Usage: node scripts/evaluate-knowledge.mjs [--prepare-queries <absolute-new-path> | --results <absolute-path>] [--answers <absolute-path>] [--thresholds 0.35,0.5,0.65,0.67,0.8] [--output report.json]');
    console.log('--prepare-queries embeds the dataset with GEMINI_API_KEY only; pass the vectors to the operator for read-only MCP SQL retrieval.');
    console.log('--results scores MCP RPC rows offline. Direct live mode uses an authenticated Supabase client and never requires service_role.');
    console.log('--answers consumes { format: 1, answers: [{ case_id, answer, fact_checks?: boolean[] }] }; fact_checks are human judgments aligned with expected_facts.');
    return;
  }
  const { cases } = JSON.parse(await readFile(datasetPath, 'utf8'));
  if (cases.length < 40 || cases.length > 50) throw new Error(`Expected 40–50 cases; found ${cases.length}.`);
  if (values['prepare-queries'] && values.results) throw new Error('Use --prepare-queries or --results, not both.');
  let answerMetrics;
  if (values.answers) {
    if (!isAbsolute(values.answers)) throw new Error('--answers requires an absolute path.');
    answerMetrics = evaluateAnswers(cases, JSON.parse(await readFile(values.answers, 'utf8')));
  }

  if (values['prepare-queries']) {
    if (values.answers) throw new Error('--answers cannot be combined with --prepare-queries.');
    loadOperatorEnv();
    const apiKey = required('GEMINI_API_KEY');
    const prepared = [];
    for (const test of cases) prepared.push({ id: test.id, question: test.question, embedding: await embedQuestion(apiKey, test.question) });
    await writeNewAbsoluteJson(values['prepare-queries'], { format: 1, model, dimensions, cases: prepared });
    console.log(`Prepared ${prepared.length} question vectors for MCP retrieval at ${values['prepare-queries']}.`);
    return;
  }

  if (values.results) {
    if (!isAbsolute(values.results)) throw new Error('--results requires an absolute path.');
    const resultFile = JSON.parse(await readFile(values.results, 'utf8'));
    const thresholdSweep = metricsFromResults(cases, resultFile);
    const report = {
      dataset: 'knowledge/evaluation/retrieval-cases.json', case_count: cases.length, embedding_model: model, dimensions,
      retrieval: 'operator-supplied match_knowledge_chunks RPC rows; document IDs deduplicated in RPC rank order, top four scored',
      generation: 'not run; answer_check annotations are criteria for a separate judged answer evaluation',
      threshold_sweep: thresholdSweep,
      ...(answerMetrics ? { answer_checklist: answerMetrics } : {}),
    };
    if (values.output) await writeFile(values.output, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    console.log('threshold | Hit@4 | MRR | no-match | off-topic | near-domain | target n | no-match n');
    for (const row of thresholdSweep) {
      const offTopic = row.no_match_accuracy_by_kind.off_topic?.accuracy ?? null;
      const nearDomain = row.no_match_accuracy_by_kind.near_domain_unanswered?.accuracy ?? null;
      console.log(`${row.threshold.toFixed(2)}      | ${(row.hit_at_4 * 100).toFixed(1)}%  | ${row.mrr.toFixed(3)} | ${(row.no_match_accuracy * 100).toFixed(1)}%       | ${offTopic === null ? 'n/a' : `${(offTopic * 100).toFixed(1)}%`}     | ${nearDomain === null ? 'n/a' : `${(nearDomain * 100).toFixed(1)}%`}       | ${row.n_answerable_or_supported}         | ${row.n_expected_no_match}`);
    }
    if (answerMetrics) console.log(`Answer checklist: ${(answerMetrics.checklist_check_pass_rate * 100).toFixed(1)}% of explicit checks passed across ${answerMetrics.evaluated_cases} answers (lexical checklist only).`);
    if (values.output) console.log(`Report written to ${values.output}`);
    return;
  }

  if (values.answers) {
    console.log(`Answer checklist: ${(answerMetrics.checklist_check_pass_rate * 100).toFixed(1)}% of explicit checks passed across ${answerMetrics.evaluated_cases} answers (lexical checklist only).`);
    if (values.output) await writeFile(values.output, `${JSON.stringify({ dataset: 'knowledge/evaluation/retrieval-cases.json', answer_checklist: answerMetrics }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    if (values.output) console.log(`Report written to ${values.output}`);
    return;
  }
  loadOperatorEnv();
  const thresholds = parseThresholds(values.thresholds);
  const apiKey = required('GEMINI_API_KEY');
  const client = await makeClient();
  console.log(`Embedding ${cases.length} questions with ${model}; running ${thresholds.length} threshold values.`);

  const embeddings = new Map();
  for (const test of cases) embeddings.set(test.id, await embedQuestion(apiKey, test.question));

  const results = [];
  for (const threshold of thresholds) {
    const retrieved = new Map();
    for (const test of cases) retrieved.set(test.id, await retrieve(client, embeddings.get(test.id), threshold));
    results.push({ threshold, ...score(cases, retrieved) });
  }
  const report = {
    dataset: 'knowledge/evaluation/retrieval-cases.json',
    case_count: cases.length,
    embedding_model: model,
    dimensions,
    retrieval: 'match_knowledge_chunks over authenticated Supabase client; top 20 chunks collapsed into first four unique document IDs',
    metrics: {
      hit_at_4: 'fraction of answerable/grounded cases with any acceptable document among top four unique documents',
      mrr: 'mean reciprocal rank of first acceptable document among top four unique documents; misses contribute zero',
      no_match_accuracy: 'fraction of off-topic/no-expected-document cases with zero returned documents',
    },
    generation: 'not run; answer_check annotations are criteria for a separate judged answer evaluation',
    threshold_sweep: results,
    ...(answerMetrics ? { answer_checklist: answerMetrics } : {}),
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (values.output) await writeFile(values.output, serialized, { encoding: 'utf8', flag: 'wx' });
  console.log('threshold | Hit@4 | MRR | no-match | off-topic | near-domain | target n | no-match n');
  for (const row of results) {
    const offTopic = row.no_match_accuracy_by_kind.off_topic?.accuracy ?? null;
    const nearDomain = row.no_match_accuracy_by_kind.near_domain_unanswered?.accuracy ?? null;
    console.log(`${row.threshold.toFixed(2)}      | ${(row.hit_at_4 * 100).toFixed(1)}%  | ${row.mrr.toFixed(3)} | ${(row.no_match_accuracy * 100).toFixed(1)}%       | ${offTopic === null ? 'n/a' : `${(offTopic * 100).toFixed(1)}%`}     | ${nearDomain === null ? 'n/a' : `${(nearDomain * 100).toFixed(1)}%`}       | ${row.n_answerable_or_supported}         | ${row.n_expected_no_match}`);
  }
  if (answerMetrics) console.log(`Answer checklist: ${(answerMetrics.checklist_check_pass_rate * 100).toFixed(1)}% of explicit checks passed across ${answerMetrics.evaluated_cases} answers (lexical checklist only).`);
  if (values.output) console.log(`Report written to ${values.output}`);
  await client.auth.signOut().catch(() => {});
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
