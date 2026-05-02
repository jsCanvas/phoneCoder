import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { ScreenCard } from '../components/ScreenCard';
import type { ProjectDto, RuntimeDto } from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import { WORKSPACE_ROOT_PATH } from './fileTree';
import {
  canOpenRuntimePreview,
  closeRuntimePreview,
  keepRuntimePreviewOnDockerScreenMount,
  openRuntimePreview,
  type RuntimePreviewWindowState,
} from './runtimePreviewWindow';
import { startRuntimeAndOpen } from './screenActions';

type PreviewScreenProps = {
  apiBaseUrl: string;
  project: ProjectDto | null;
  runtimeDirectory?: string;
  previewWindow: RuntimePreviewWindowState;
  onPreviewWindowChange(state: RuntimePreviewWindowState): void;
};

export function PreviewScreen({
  apiBaseUrl,
  project,
  runtimeDirectory,
  previewWindow,
  onPreviewWindowChange,
}: PreviewScreenProps) {
  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);
  const [runtime, setRuntime] = useState<RuntimeDto | null>(null);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    setRuntime(null);
    onPreviewWindowChange(keepRuntimePreviewOnDockerScreenMount(previewWindow));
    setLogs('');
    if (project) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, apiBaseUrl]);

  useEffect(() => {
    if (project && runtimeDirectory) void start(runtimeDirectory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, runtimeDirectory, apiBaseUrl]);

  async function refresh() {
    if (!project) return;
    try {
      const next = await apiClient.getRuntime(project.id);
      setRuntime(next);
      if (!next.preview_url) onPreviewWindowChange(closeRuntimePreview());
    } catch (error) {
      setStatus(`Get runtime failed: ${getErrorMessage(error)}`);
    }
  }

  async function start(composeDir?: string) {
    if (!project) return;
    const composePath = composeDir === WORKSPACE_ROOT_PATH ? undefined : composeDir;
    const where =
      composeDir === WORKSPACE_ROOT_PATH
        ? ' at workspace root'
        : composePath
          ? ` from ${composePath}`
          : '';
    try {
      const next = await startRuntimeAndOpen({
        apiClient,
        projectId: project.id,
        composePath,
        openUrl: (url) => void Linking.openURL(url),
      });
      setRuntime(next);
      setStatus(
        next.preview_url ? `Started${where}. Preview: ${next.preview_url}` : `Started${where}.`,
      );
    } catch (error) {
      setStatus(`Start failed: ${getErrorMessage(error)}`);
    }
  }

  async function stop() {
    if (!project) return;
    try {
      const next = await apiClient.runtimeDown(project.id);
      setRuntime(next);
      onPreviewWindowChange(closeRuntimePreview());
      setStatus('Stopped.');
    } catch (error) {
      setStatus(`Stop failed: ${getErrorMessage(error)}`);
    }
  }

  function openPreviewWindow() {
    onPreviewWindowChange(openRuntimePreview(runtime?.preview_url, previewWindow.position ?? undefined));
  }

  async function tailLogs() {
    if (!project) return;
    try {
      const url = apiClient.runtimeLogsUrl(project.id);
      const response = await fetch(url, {
        headers: { Accept: 'text/event-stream' },
      });
      if (!response.ok || !response.body) {
        setStatus(`Logs unavailable (${response.status})`);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let collected = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        collected += decoder.decode(value, { stream: true });
        setLogs(collected.slice(-4000));
      }
    } catch (error) {
      setStatus(`Logs failed: ${getErrorMessage(error)}`);
    }
  }

  return (
    <View style={styles.stack}>
      <ScreenCard
        title="Docker runtime"
        description={
          project
            ? 'Bring the project sandbox up and visit the routed preview URL.'
            : 'Pick a project first.'
        }
      >
        <View style={styles.row}>
          <RuntimeActionButton title="Up" disabled={!project} onPress={() => void start()} />
          <RuntimeActionButton title="Down" disabled={!project} onPress={() => void stop()} />
          <RuntimeActionButton title="Refresh" disabled={!project} onPress={() => void refresh()} />
          <RuntimeActionButton
            title="Preview"
            disabled={!canOpenRuntimePreview(runtime?.preview_url)}
            onPress={openPreviewWindow}
          />
          <RuntimeActionButton title="Tail logs" disabled={!project} onPress={() => void tailLogs()} />
        </View>
        {runtime ? (
          <View style={styles.runtimeCard}>
            <Text style={styles.title}>status: {runtime.status}</Text>
            {runtime.preview_url ? (
              <Text style={styles.url} onPress={() => void Linking.openURL(runtime.preview_url!)}>
                {runtime.preview_url}
              </Text>
            ) : (
              <Text style={styles.detail}>preview_url: not yet routed</Text>
            )}
            {runtime.compose_file ? (
              <Text style={styles.detail}>compose: {runtime.compose_file}</Text>
            ) : null}
            <Text style={styles.detail}>updated: {runtime.updated_at}</Text>
          </View>
        ) : (
          <Text style={styles.empty}>No runtime info yet.</Text>
        )}
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScreenCard>

      {logs ? (
        <ScreenCard title="Recent logs" description="Last 4 KB of streamed output.">
          <Text style={styles.logs}>{logs}</Text>
        </ScreenCard>
      ) : null}
    </View>
  );
}

function RuntimeActionButton({
  title,
  disabled,
  onPress,
}: {
  title: string;
  disabled?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    >
      <Text numberOfLines={1} style={styles.actionButtonText}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexBasis: '30%',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  actionButtonDisabled: { opacity: 0.45 },
  actionButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  runtimeCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  title: { color: '#0f172a', fontWeight: '800' },
  detail: { color: '#475569', fontSize: 12 },
  url: { color: '#4338ca', fontWeight: '700' },
  empty: { color: '#64748b', marginTop: 12 },
  status: { color: '#475569', marginTop: 12 },
  logs: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: 12,
  },
});
