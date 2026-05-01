import { reduceAgentEvent } from '../src/events/eventReducer';
import { initialAgentTimeline, type AgentTimelineState } from '../src/events/types';

describe('reduceAgentEvent', () => {
  it('handles a full successful run-started → assistant-text → tool-use → tool-result → run-completed sequence', () => {
    let state: AgentTimelineState = initialAgentTimeline;
    state = reduceAgentEvent(state, {
      type: 'run-started',
      runId: 'run-1',
      claudeSessionId: 'cs-1',
    });
    expect(state).toMatchObject({ runId: 'run-1', status: 'running', assistantText: '' });

    state = reduceAgentEvent(state, { type: 'assistant-text', delta: 'Hello ' });
    state = reduceAgentEvent(state, { type: 'assistant-text', delta: 'world.' });
    expect(state.assistantText).toBe('Hello world.');

    state = reduceAgentEvent(state, {
      type: 'tool-use',
      toolUseId: 't1',
      name: 'Bash',
      input: { command: 'ls' },
    });
    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0].ok).toBeUndefined();

    state = reduceAgentEvent(state, {
      type: 'tool-result',
      toolUseId: 't1',
      ok: true,
      summary: 'listed files',
    });
    expect(state.toolCalls[0]).toMatchObject({ ok: true, summary: 'listed files' });

    state = reduceAgentEvent(state, {
      type: 'file-changed',
      path: 'src/index.ts',
      action: 'create',
    });
    expect(state.fileChanges['src/index.ts']).toMatchObject({ action: 'create' });

    state = reduceAgentEvent(state, {
      type: 'run-completed',
      status: 'success',
      stopReason: 'end_turn',
    });
    expect(state.status).toBe('completed');
    expect(state.stopReason).toBe('end_turn');
  });

  it('records errors and maps run-completed status', () => {
    let state: AgentTimelineState = initialAgentTimeline;
    state = reduceAgentEvent(state, { type: 'error', code: 'rate_limit', message: 'slow down' });
    expect(state.errors).toEqual([{ code: 'rate_limit', message: 'slow down' }]);

    state = reduceAgentEvent(state, { type: 'run-completed', status: 'aborted' });
    expect(state.status).toBe('aborted');

    state = reduceAgentEvent(state, { type: 'run-completed', status: 'error' });
    expect(state.status).toBe('error');
  });

  it('starting a new run clears prior assistant text and tool calls', () => {
    let state: AgentTimelineState = initialAgentTimeline;
    state = reduceAgentEvent(state, { type: 'run-started', runId: 'r1', claudeSessionId: null });
    state = reduceAgentEvent(state, { type: 'assistant-text', delta: 'old' });
    state = reduceAgentEvent(state, { type: 'run-started', runId: 'r2', claudeSessionId: null });
    expect(state.assistantText).toBe('');
    expect(state.toolCalls).toEqual([]);
    expect(state.runId).toBe('r2');
  });

  it('ignores tool-result for an unknown tool id', () => {
    let state: AgentTimelineState = initialAgentTimeline;
    state = reduceAgentEvent(state, {
      type: 'tool-result',
      toolUseId: 'missing',
      ok: true,
      summary: '',
    });
    expect(state.toolCalls).toEqual([]);
  });
});
