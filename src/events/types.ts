/**
 * Streaming events emitted by dockerBot's SSE endpoint
 * `POST /api/sessions/:sid/messages`.
 *
 * They map 1:1 with the `event:` lines on the wire.
 */
export type AgentEvent =
  | { type: 'run-started'; runId: string; claudeSessionId: string | null }
  | { type: 'assistant-text'; delta: string }
  | { type: 'tool-use'; toolUseId: string; name: string; input: unknown }
  | { type: 'tool-result'; toolUseId: string; ok: boolean; summary: string }
  | { type: 'file-changed'; path: string; action: 'create' | 'update' | 'delete' }
  | {
      type: 'token-usage';
      inputTokens?: number;
      outputTokens?: number;
      cacheReadTokens?: number;
      cacheCreateTokens?: number;
      costUsd?: number;
    }
  | {
      type: 'run-completed';
      status: 'success' | 'error' | 'aborted';
      stopReason?: string;
    }
  | { type: 'error'; code: string; message: string };

export type ToolCallState = {
  toolUseId: string;
  name: string;
  input: unknown;
  /** undefined => still running. */
  ok?: boolean;
  summary?: string;
};

export type FileChangeEntry = {
  path: string;
  action: 'create' | 'update' | 'delete';
  /** Server time we observed it (millis). */
  observedAt: number;
};

export type RunStatus = 'idle' | 'running' | 'completed' | 'aborted' | 'error';

export type AgentTimelineState = {
  runId: string | null;
  claudeSessionId: string | null;
  status: RunStatus;
  /** Accumulated streamed text from the assistant. */
  assistantText: string;
  /** Tool calls keyed by toolUseId, preserving insertion order. */
  toolCalls: ToolCallState[];
  /** File-changed events deduped by path (latest action wins). */
  fileChanges: Record<string, FileChangeEntry>;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreateTokens?: number;
    costUsd?: number;
  };
  errors: { code: string; message: string }[];
  stopReason?: string;
};

export const initialAgentTimeline: AgentTimelineState = {
  runId: null,
  claudeSessionId: null,
  status: 'idle',
  assistantText: '',
  toolCalls: [],
  fileChanges: {},
  errors: [],
};
