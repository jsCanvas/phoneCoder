import type { AgentEvent } from './types';

type RawSseFrame = { event?: string; data: string };

/**
 * Stateful incremental parser for the SSE wire format.
 *
 * Handles:
 * - CRLF / LF line endings
 * - Multi-line `data:` continuations (concatenated with "\n")
 * - Multiple consecutive blank lines
 *
 * Returns full frames once a blank line is observed.
 */
export class SseFrameParser {
  private buffer = '';

  /** Feed a chunk of raw text; returns any frames that completed in this chunk. */
  push(chunk: string): RawSseFrame[] {
    this.buffer += chunk.replace(/\r\n/g, '\n');
    const frames: RawSseFrame[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf('\n\n')) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const frame = parseFrame(block);
      if (frame) frames.push(frame);
    }
    return frames;
  }
}

function parseFrame(block: string): RawSseFrame | null {
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0 && !event) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * Convert a parsed SSE frame into a domain `AgentEvent`.
 * Returns `null` for unrecognised/heartbeat frames so the caller can ignore them.
 */
export function frameToAgentEvent(frame: RawSseFrame): AgentEvent | null {
  if (!frame.event || !frame.data) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame.data);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const payload = parsed as Record<string, unknown>;
  switch (frame.event) {
    case 'run-started':
      return {
        type: 'run-started',
        runId: String(payload.runId ?? ''),
        claudeSessionId: (payload.claudeSessionId as string | null | undefined) ?? null,
      };
    case 'assistant-text':
      return { type: 'assistant-text', delta: String(payload.delta ?? '') };
    case 'tool-use':
      return {
        type: 'tool-use',
        toolUseId: String(payload.toolUseId ?? ''),
        name: String(payload.name ?? ''),
        input: payload.input,
      };
    case 'tool-result':
      return {
        type: 'tool-result',
        toolUseId: String(payload.toolUseId ?? ''),
        ok: Boolean(payload.ok),
        summary: String(payload.summary ?? ''),
      };
    case 'file-changed':
      return {
        type: 'file-changed',
        path: String(payload.path ?? ''),
        action: (payload.action as 'create' | 'update' | 'delete') ?? 'update',
      };
    case 'token-usage':
      return {
        type: 'token-usage',
        inputTokens: payload.inputTokens as number | undefined,
        outputTokens: payload.outputTokens as number | undefined,
        cacheReadTokens: payload.cacheReadTokens as number | undefined,
        cacheCreateTokens: payload.cacheCreateTokens as number | undefined,
        costUsd: payload.costUsd as number | undefined,
      };
    case 'run-completed':
      return {
        type: 'run-completed',
        status: (payload.status as 'success' | 'error' | 'aborted') ?? 'success',
        stopReason: payload.stopReason as string | undefined,
      };
    case 'error':
      return {
        type: 'error',
        code: String(payload.code ?? 'unknown'),
        message: String(payload.message ?? ''),
      };
    default:
      return null;
  }
}
