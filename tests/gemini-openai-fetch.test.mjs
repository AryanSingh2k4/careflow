import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiOpenAICompatibleFetch } from '../src/lib/gemini-openai-fetch.ts';

test('repairs missing Gemini tool indexes and normalizes the following stop finish reason', async () => {
  const signatures = new Map();
  const raw = [
    'data: {"choices":[{"delta":{"tool_calls":[{"id":"call-1","type":"function","function":{"name":"search","arguments":"{}"},"extra_content":{"google":"sig-1"}}]},"finish_reason":null}]}\r\n\r\n',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\r\n\r\n',
    'data: [DONE]\r\n\r\n',
  ].join('');
  const adapter = createGeminiOpenAICompatibleFetch(signatures, async () => new Response(raw, {
    headers: { 'content-type': 'text/event-stream' },
  }));
  const response = await adapter('https://example.test/chat', { method: 'POST' });
  const output = await response.text();
  assert.match(output, /"index":0/);
  assert.match(output, /"finish_reason":"tool_calls"/);
  assert.equal(signatures.get('call-1'), 'sig-1');
});

test('preserves supplied tool indexes and restores Google signatures on the next assistant request', async () => {
  const signatures = new Map([['call-2', 'sig-2']]);
  let sentPayload;
  const adapter = createGeminiOpenAICompatibleFetch(signatures, async request => {
    sentPayload = JSON.parse(await request.text());
    return Response.json({ ok: true });
  });
  await adapter('https://example.test/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'assistant', tool_calls: [{ id: 'call-2', type: 'function', function: { name: 'search', arguments: '{}' } }] }] }),
  });
  assert.deepEqual(sentPayload.messages[0].tool_calls[0].extra_content, { google: 'sig-2' });
});

test('does not repair SSE that has no tool call, and preserves existing indexes', async () => {
  const raw = 'data: {"choices":[{"delta":{"tool_calls":[{"index":4,"id":"call-4","type":"function","function":{"name":"x","arguments":"{}"}}]},"finish_reason":null}]}\n\n';
  const adapter = createGeminiOpenAICompatibleFetch(new Map(), async () => new Response(raw, {
    headers: { 'content-type': 'text/event-stream' },
  }));
  const output = await (await adapter('https://example.test/chat')).text();
  assert.match(output, /"index":4/);
});

test('assigns unique monotonic indexes to separate CRLF frames and preserves SSE framing', async () => {
  const first = 'event: message\r\ndata: {"choices":[{"delta":{"tool_calls":[{"id":"call-a","type":"function","function":{"name":"first","arguments":"{}"}}]},"finish_reason":null}]}\r\n\r\n';
  const second = 'data: {"choices":[{"delta":{"tool_calls":[{"id":"call-b","type":"function","function":{"name":"second","arguments":"{}"}}]},"finish_reason":null}]}\r\n\r\n';
  const adapter = createGeminiOpenAICompatibleFetch(new Map(), async () => new Response(first + second, {
    headers: { 'content-type': 'text/event-stream' },
  }));
  const output = await (await adapter('https://example.test/chat')).text();
  const callAFrame = output.split('\r\n\r\n')[0];
  const callBFrame = output.split('\r\n\r\n')[1];
  assert.match(callAFrame, /"id":"call-a"[^\n]*"index":0/);
  assert.match(callBFrame, /"id":"call-b"[^\n]*"index":1/);
  assert.equal((output.match(/\r\n\r\n/g) ?? []).length, 2);
  assert.match(callAFrame, /^event: message\r\ndata:/);
});

test('keeps an idless continuation on the active index and respects later explicit indexes', async () => {
  const frames = [
    { id: 'call-one', type: 'function', function: { name: 'first', arguments: '{' } },
    { type: 'function', function: { arguments: '}' } },
    { index: 5, id: 'call-six', type: 'function', function: { name: 'sixth', arguments: '{}' } },
    { id: 'call-seven', type: 'function', function: { name: 'seventh', arguments: '{}' } },
  ].map(toolCall => `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [toolCall] }, finish_reason: null }] })}\n\n`).join('');
  const adapter = createGeminiOpenAICompatibleFetch(new Map(), async () => new Response(frames, {
    headers: { 'content-type': 'text/event-stream' },
  }));
  const output = await (await adapter('https://example.test/chat')).text();
  const indices = [...output.matchAll(/"index":(\d+)/g)].map(match => Number(match[1]));
  assert.deepEqual(indices, [0, 0, 5, 6]);
});
