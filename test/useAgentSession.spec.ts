import { reduceAgentEvent } from '../src/events/eventReducer';
import { SseFrameParser, frameToAgentEvent } from '../src/events/sseParser';
import { initialAgentTimeline } from '../src/events/types';

/**
 * The `useAgentSession` hook has React-state side effects, but its core
 * "consume an SSE wire stream and reduce it to a final timeline" pipeline is
 * pure and identical to what the hook runs. We cover that pipeline here so
 * the hook stays trivially correct: hook = pipeline + dispatch.
 */
describe('useAgentSession streaming pipeline', () => {
  it('reduces a multi-chunk SSE payload into a completed timeline', () => {
    const wire =
      'event: run-started\ndata: {"runId":"r1","claudeSessionId":"cs1"}\n\n' +
      'event: assistant-text\ndata: {"delta":"Hi "}\n\n' +
      'event: tool-use\ndata: {"toolUseId":"t","name":"Bash","input":{"command":"ls"}}\n\n' +
      'event: tool-result\ndata: {"toolUseId":"t","ok":true,"summary":"ok"}\n\n' +
      'event: file-changed\ndata: {"path":"a.ts","action":"create"}\n\n' +
      'event: assistant-text\ndata: {"delta":"there."}\n\n' +
      'event: token-usage\ndata: {"inputTokens":12,"outputTokens":8,"costUsd":0.0007}\n\n' +
      'event: run-completed\ndata: {"status":"success","stopReason":"end_turn"}\n\n';

    const parser = new SseFrameParser();
    const chunks = chunkString(wire, 24);
    let state = initialAgentTimeline;
    for (const chunk of chunks) {
      for (const frame of parser.push(chunk)) {
        const event = frameToAgentEvent(frame);
        if (event) state = reduceAgentEvent(state, event);
      }
    }

    expect(state.runId).toBe('r1');
    expect(state.assistantText).toBe('Hi there.');
    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0]).toMatchObject({ ok: true, summary: 'ok' });
    expect(state.fileChanges['a.ts']).toMatchObject({ action: 'create' });
    expect(state.tokenUsage).toMatchObject({ inputTokens: 12, outputTokens: 8 });
    expect(state.status).toBe('completed');
    expect(state.stopReason).toBe('end_turn');
  });
});

function chunkString(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}
