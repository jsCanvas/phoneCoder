import { SseFrameParser, frameToAgentEvent } from '../src/events/sseParser';

describe('SseFrameParser', () => {
  it('parses a stream split across multiple chunks and ignores keep-alives', () => {
    const parser = new SseFrameParser();
    const frames1 = parser.push('event: run-started\n');
    const frames2 = parser.push('data: {"runId":"r1","claudeSessionId":null}\n\n');
    const frames3 = parser.push(': keep-alive\n\nevent: ass');
    const frames4 = parser.push('istant-text\ndata: {"delta":"Hi"}\n\n');
    const frames = [...frames1, ...frames2, ...frames3, ...frames4];

    expect(frames).toEqual([
      { event: 'run-started', data: '{"runId":"r1","claudeSessionId":null}' },
      { event: 'assistant-text', data: '{"delta":"Hi"}' },
    ]);
  });

  it('handles CRLF line endings and multi-line data', () => {
    const parser = new SseFrameParser();
    const frames = parser.push('event: tool-result\r\ndata: {"toolUseId":"t1","ok":true,\r\ndata:  "summary":"x"}\r\n\r\n');
    expect(frames).toHaveLength(1);
    expect(frames[0].event).toBe('tool-result');
    expect(frames[0].data).toContain('"summary":"x"');
  });
});

describe('frameToAgentEvent', () => {
  it('converts run-started, assistant-text, tool-use, tool-result, file-changed, run-completed and error frames', () => {
    expect(
      frameToAgentEvent({
        event: 'run-started',
        data: '{"runId":"r1","claudeSessionId":"cs1"}',
      }),
    ).toEqual({ type: 'run-started', runId: 'r1', claudeSessionId: 'cs1' });

    expect(
      frameToAgentEvent({ event: 'assistant-text', data: '{"delta":"hello"}' }),
    ).toEqual({ type: 'assistant-text', delta: 'hello' });

    expect(
      frameToAgentEvent({
        event: 'tool-use',
        data: '{"toolUseId":"t","name":"Bash","input":{"command":"ls"}}',
      }),
    ).toEqual({
      type: 'tool-use',
      toolUseId: 't',
      name: 'Bash',
      input: { command: 'ls' },
    });

    expect(
      frameToAgentEvent({
        event: 'tool-result',
        data: '{"toolUseId":"t","ok":true,"summary":"ok"}',
      }),
    ).toEqual({ type: 'tool-result', toolUseId: 't', ok: true, summary: 'ok' });

    expect(
      frameToAgentEvent({
        event: 'file-changed',
        data: '{"path":"a.ts","action":"update"}',
      }),
    ).toEqual({ type: 'file-changed', path: 'a.ts', action: 'update' });

    expect(
      frameToAgentEvent({
        event: 'run-completed',
        data: '{"status":"success","stopReason":"end_turn"}',
      }),
    ).toEqual({ type: 'run-completed', status: 'success', stopReason: 'end_turn' });

    expect(
      frameToAgentEvent({ event: 'error', data: '{"code":"x","message":"y"}' }),
    ).toEqual({ type: 'error', code: 'x', message: 'y' });
  });

  it('returns null for unrecognised events or invalid JSON', () => {
    expect(frameToAgentEvent({ event: 'unknown', data: '{}' })).toBeNull();
    expect(frameToAgentEvent({ event: 'run-started', data: 'not json' })).toBeNull();
    expect(frameToAgentEvent({ data: 'no event name' })).toBeNull();
  });
});
