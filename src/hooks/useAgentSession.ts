import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { PhoneBotApiClient } from '../api/phoneBotApi';
import { reduceAgentEvent } from '../events/eventReducer';
import { SseFrameParser, frameToAgentEvent } from '../events/sseParser';
import { initialAgentTimeline, type AgentEvent, type AgentTimelineState } from '../events/types';
import type { SendMessageInput } from '../types/api';

/**
 * A reader-cancel hook that, given a session id, lets the caller post a user
 * message which streams back as Server-Sent Events.
 *
 * Implementation note:
 * - phoneBot uses *named* SSE events (`event: tool-use`), so we do not rely on
 *   the browser's `EventSource` (which only triggers default-message handlers
 *   conveniently). Instead we use `fetch` with a streamed body and parse
 *   frames ourselves.
 * - The hook accepts an injectable `streamFetch` to support tests in Node.
 */
export type StreamFetchLike = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}>;

type Action = { type: 'reset' } | { type: 'event'; event: AgentEvent };

function reducer(state: AgentTimelineState, action: Action): AgentTimelineState {
  if (action.type === 'reset') return initialAgentTimeline;
  return reduceAgentEvent(state, action.event);
}

export type UseAgentSessionOptions = {
  apiClient: PhoneBotApiClient;
  sessionId: string | null;
  streamFetch?: StreamFetchLike;
};

export function useAgentSession({ apiClient, sessionId, streamFetch }: UseAgentSessionOptions) {
  const [state, dispatch] = useReducer(reducer, initialAgentTimeline);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Cancel in-flight stream when the session changes or component unmounts.
  useEffect(() => {
    dispatch({ type: 'reset' });
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [sessionId]);

  const send = useCallback(
    async (input: SendMessageInput): Promise<AgentTimelineState> => {
      const sid = sessionRef.current;
      if (!sid) throw new Error('No active session.');
      stop();
      dispatch({ type: 'reset' });
      const controller = new AbortController();
      abortRef.current = controller;

      const fetchImpl = streamFetch ?? (defaultStreamFetch as StreamFetchLike);
      const response = await fetchImpl(apiClient.sessionStreamUrl(sid), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = `phoneBot stream failed (${response.status})`;
        try {
          const txt = await response.text();
          if (txt) message = txt;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      if (!response.body) {
        throw new Error('phoneBot stream returned no body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const parser = new SseFrameParser();
      let latest: AgentTimelineState = initialAgentTimeline;

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const frame of parser.push(text)) {
            const event = frameToAgentEvent(frame);
            if (!event) continue;
            latest = reduceAgentEvent(latest, event);
            dispatch({ type: 'event', event });
            if (event.type === 'run-completed') {
              return latest;
            }
          }
        }
      } finally {
        reader.releaseLock?.();
      }
      return latest;
    },
    [apiClient, streamFetch, stop],
  );

  return { state, send, stop, reset };
}

const defaultStreamFetch: StreamFetchLike = (url, init) =>
  globalThis.fetch(url, init) as unknown as ReturnType<StreamFetchLike>;
