import { StyleSheet, Text, View } from 'react-native';
import type { AgentTimelineState } from '../events/types';

type AgentTimelineProps = {
  state: AgentTimelineState;
};

const STATUS_LABEL: Record<AgentTimelineState['status'], string> = {
  idle: 'Idle',
  running: 'Running…',
  completed: 'Completed',
  aborted: 'Aborted',
  error: 'Error',
};

export function AgentTimeline({ state }: AgentTimelineProps) {
  const fileChanges = Object.values(state.fileChanges);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agent stream</Text>
        <Text style={[styles.statusBadge, badgeStyles(state.status)]}>
          {STATUS_LABEL[state.status]}
        </Text>
      </View>

      {state.assistantText ? (
        <Text style={styles.assistant}>{state.assistantText}</Text>
      ) : (
        <Text style={styles.empty}>No assistant output yet.</Text>
      )}

      {state.toolCalls.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tool calls</Text>
          {state.toolCalls.map((call) => (
            <View key={call.toolUseId} style={styles.toolCard}>
              <Text style={styles.toolName}>
                {call.name}
                {call.ok === undefined ? ' · running' : call.ok ? ' · ok' : ' · failed'}
              </Text>
              {call.summary ? <Text style={styles.toolSummary}>{call.summary}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {fileChanges.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File changes</Text>
          {fileChanges.map((entry) => (
            <Text key={entry.path} style={styles.fileLine}>
              [{entry.action}] {entry.path}
            </Text>
          ))}
        </View>
      ) : null}

      {state.tokenUsage ? (
        <Text style={styles.usage}>
          tokens: in={state.tokenUsage.inputTokens ?? 0} out={state.tokenUsage.outputTokens ?? 0}
          {state.tokenUsage.costUsd != null ? ` cost=$${state.tokenUsage.costUsd.toFixed(4)}` : ''}
        </Text>
      ) : null}

      {state.errors.map((err, idx) => (
        <Text key={`${err.code}-${idx}`} style={styles.error}>
          [{err.code}] {err.message}
        </Text>
      ))}

      {state.stopReason ? <Text style={styles.usage}>stop reason: {state.stopReason}</Text> : null}
    </View>
  );
}

function badgeStyles(status: AgentTimelineState['status']) {
  switch (status) {
    case 'running':
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'completed':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'aborted':
      return { backgroundColor: '#e2e8f0', color: '#1e293b' };
    case 'error':
      return { backgroundColor: '#fee2e2', color: '#991b1b' };
    case 'idle':
    default:
      return { backgroundColor: '#f1f5f9', color: '#475569' };
  }
}

const styles = StyleSheet.create({
  container: { gap: 8, marginTop: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800' },
  statusBadge: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  assistant: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    color: '#0f172a',
    padding: 10,
  },
  empty: { color: '#64748b' },
  section: { gap: 4, marginTop: 6 },
  sectionTitle: { color: '#1e293b', fontSize: 13, fontWeight: '800' },
  toolCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 8,
  },
  toolName: { color: '#0f172a', fontWeight: '700' },
  toolSummary: { color: '#475569', fontSize: 12, marginTop: 2 },
  fileLine: { color: '#0f172a', fontSize: 12 },
  usage: { color: '#475569', fontSize: 12 },
  error: { color: '#b91c1c', fontSize: 12 },
});
