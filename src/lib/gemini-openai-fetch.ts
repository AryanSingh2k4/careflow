/**
 * Gemini's OpenAI-compatible stream currently omits tool-call indexes and emits
 * Google thought signatures outside the OpenAI schema. Repair those two wire
 * differences at the fetch boundary for this chat request only.
 */
export function createGeminiOpenAICompatibleFetch(
  signatures = new Map<string, unknown>(),
  fetchImpl: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const requestBody = await request.clone().text();
    let outgoing = request;
    if (requestBody) {
      try {
        const payload = JSON.parse(requestBody) as { messages?: Array<Record<string, unknown>> };
        let changed = false;
        for (const message of payload.messages ?? []) {
          if (message.role !== 'assistant' || !Array.isArray(message.tool_calls)) continue;
          for (const rawCall of message.tool_calls) {
            if (!rawCall || typeof rawCall !== 'object') continue;
            const call = rawCall as Record<string, unknown>;
            const id = call.id;
            const google = typeof id === 'string' ? signatures.get(id) : undefined;
            if (google !== undefined) {
              call.extra_content = { ...(call.extra_content as Record<string, unknown> | undefined), google };
              changed = true;
            }
          }
        }
        if (changed) {
          const headers = new Headers(request.headers);
          headers.delete('content-length');
          outgoing = new Request(request.url, { method: request.method, headers, body: JSON.stringify(payload), signal: request.signal });
        }
      } catch {
        // Leave non-JSON or unsupported request bodies untouched.
      }
    }

    const response = await fetchImpl(outgoing);
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) return response;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffered = '';
    const streamState = { sawToolCall: false, nextToolIndex: 0, activeToolIndex: undefined as number | undefined, toolIndexById: new Map<string, number>() };
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        let delimiter = /\r?\n\r?\n/.exec(buffered);
        while (!delimiter) {
          const { done, value } = await reader.read();
          if (done) {
            buffered += decoder.decode();
            if (buffered) controller.enqueue(encoder.encode(transformSseFrame(buffered, signatures, streamState)));
            controller.close();
            return;
          }
          buffered += decoder.decode(value, { stream: true });
          delimiter = /\r?\n\r?\n/.exec(buffered);
        }
        const boundary = delimiter.index + delimiter[0].length;
        const frame = buffered.slice(0, boundary);
        buffered = buffered.slice(boundary);
        controller.enqueue(encoder.encode(transformSseFrame(frame, signatures, streamState)));
      },
      cancel(reason) { return reader.cancel(reason); },
    });
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('transfer-encoding');
    return new Response(stream, { status: response.status, statusText: response.statusText, headers });
  };
}

function transformSseFrame(
  frame: string,
  signatures: Map<string, unknown>,
  streamState: { sawToolCall: boolean; nextToolIndex: number; activeToolIndex?: number; toolIndexById: Map<string, number> },
): string {
  const dataLines = frame.split(/\r?\n/).filter(line => line.startsWith('data:'));
  if (!dataLines.length) return frame;
  const data = dataLines.map(line => line.slice(5).trimStart()).join('\n');
  if (data === '[DONE]') return frame;
  let event: Record<string, unknown>;
  try { event = JSON.parse(data) as Record<string, unknown>; } catch { return frame; }
  const choices = event.choices;
  if (!Array.isArray(choices)) return frame;
  let hasToolCall = false;
  for (const rawChoice of choices) {
    if (!rawChoice || typeof rawChoice !== 'object') continue;
    const choice = rawChoice as Record<string, unknown>;
    const delta = choice.delta;
    if (delta && typeof delta === 'object') {
      const toolCalls = (delta as Record<string, unknown>).tool_calls;
      if (Array.isArray(toolCalls)) {
        for (let index = 0; index < toolCalls.length; index += 1) {
          const rawCall = toolCalls[index];
          if (!rawCall || typeof rawCall !== 'object') continue;
          const call = rawCall as Record<string, unknown>;
          hasToolCall = true;
          streamState.sawToolCall = true;
          if (typeof call.index === 'number') {
            streamState.nextToolIndex = Math.max(streamState.nextToolIndex, call.index + 1);
            streamState.activeToolIndex = call.index;
            if (typeof call.id === 'string') streamState.toolIndexById.set(call.id, call.index);
          } else if (typeof call.id === 'string' && streamState.toolIndexById.has(call.id)) {
            call.index = streamState.toolIndexById.get(call.id);
            streamState.activeToolIndex = call.index as number;
          } else {
            call.index = typeof call.id !== 'string' && streamState.activeToolIndex !== undefined
              ? streamState.activeToolIndex
              : streamState.nextToolIndex++;
            streamState.activeToolIndex = call.index as number;
            if (typeof call.id === 'string') streamState.toolIndexById.set(call.id, call.index as number);
          }
          const google = (call.extra_content as Record<string, unknown> | undefined)?.google;
          if (typeof call.id === 'string' && google !== undefined) signatures.set(call.id, google);
        }
      }
    }
    if ((hasToolCall || streamState.sawToolCall) && choice.finish_reason === 'stop') choice.finish_reason = 'tool_calls';
  }
  if (!event.choices || !(event.choices as Array<Record<string, unknown>>).some(choice => choice?.delta && typeof choice.delta === 'object' && Array.isArray((choice.delta as Record<string, unknown>).tool_calls)) &&
      !(event.choices as Array<Record<string, unknown>>).some(choice => choice?.finish_reason === 'tool_calls')) {
    return frame;
  }
  const newline = frame.includes('\r\n') ? '\r\n' : '\n';
  const delimiter = /(\r?\n\r?\n)$/.exec(frame)?.[0] ?? '';
  const payloadFrame = delimiter ? frame.slice(0, -delimiter.length) : frame;
  const lines = payloadFrame.split(/\r?\n/);
  let replacedDataLine = false;
  const rewrittenLines = lines.flatMap(line => {
    if (!line.startsWith('data:')) return [line];
    if (replacedDataLine) return [];
    replacedDataLine = true;
    return [`data: ${JSON.stringify(event)}`];
  });
  return rewrittenLines.join(newline) + delimiter;
}
