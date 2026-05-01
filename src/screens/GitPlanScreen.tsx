import { useEffect, useMemo, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { FormField } from '../components/FormField';
import { ScreenCard } from '../components/ScreenCard';
import type { GitStatusDto, ProjectDto } from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import { commitAndPushProject } from './screenActions';

type GitPlanScreenProps = {
  apiBaseUrl: string;
  project: ProjectDto | null;
};

export function GitPlanScreen({ apiBaseUrl, project }: GitPlanScreenProps) {
  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);
  const [message, setMessage] = useState('chore: phoneBot updates');
  const [branch, setBranch] = useState('');
  const [checkoutBranch, setCheckoutBranch] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatusDto | null>(null);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setGitStatus(null);
    if (project) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, apiBaseUrl]);

  async function refresh() {
    if (!project) return;
    try {
      const next = await apiClient.gitStatus(project.id);
      setGitStatus(next);
      if (next.branch && !branch) setBranch(next.branch);
    } catch (error) {
      setStatus(`Status failed: ${getErrorMessage(error)}`);
    }
  }

  async function commit() {
    if (!project) return;
    try {
      const r = await commitAndPushProject({
        apiClient,
        projectId: project.id,
        message,
        branch: branch || undefined,
        checkoutBranch: checkoutBranch && Boolean(branch.trim()),
      });
      setResult(JSON.stringify(r, null, 2));
      setStatus('Committed and pushed.');
      await refresh();
    } catch (error) {
      setStatus(`Commit failed: ${getErrorMessage(error)}`);
    }
  }

  return (
    <View style={styles.stack}>
      <ScreenCard
        title="Git status"
        description={
          project
            ? gitStatus?.clean
              ? 'Working tree clean.'
              : 'Working tree has changes.'
            : 'Pick a project first.'
        }
      >
        <Button title="Refresh" disabled={!project} onPress={() => void refresh()} />
        {gitStatus ? (
          <View style={styles.statusCard}>
            <Text style={styles.title}>
              branch: {gitStatus.branch ?? '(detached)'} · ahead {gitStatus.ahead} · behind {gitStatus.behind}
            </Text>
            {gitStatus.modified.length > 0 ? (
              <Text style={styles.line}>modified: {gitStatus.modified.join(', ')}</Text>
            ) : null}
            {gitStatus.staged.length > 0 ? (
              <Text style={styles.line}>staged: {gitStatus.staged.join(', ')}</Text>
            ) : null}
            {gitStatus.untracked.length > 0 ? (
              <Text style={styles.line}>untracked: {gitStatus.untracked.join(', ')}</Text>
            ) : null}
            {gitStatus.deleted.length > 0 ? (
              <Text style={styles.line}>deleted: {gitStatus.deleted.join(', ')}</Text>
            ) : null}
            {gitStatus.conflicted.length > 0 ? (
              <Text style={styles.error}>conflicted: {gitStatus.conflicted.join(', ')}</Text>
            ) : null}
          </View>
        ) : null}
      </ScreenCard>

      <ScreenCard
        title="One-click commit + push"
        description="Stages everything, commits, then pushes to the chosen branch."
      >
        <FormField label="Branch (blank = current)" value={branch} onChangeText={setBranch} />
        <Pressable
          disabled={!branch.trim()}
          onPress={() => setCheckoutBranch((value) => !value)}
          style={[
            styles.branchToggle,
            checkoutBranch && styles.branchToggleActive,
            !branch.trim() && styles.branchToggleDisabled,
          ]}
        >
          <Text style={[styles.branchToggleDot, checkoutBranch && styles.branchToggleDotActive]}>
            {checkoutBranch ? '✓' : ''}
          </Text>
          <View style={styles.branchToggleText}>
            <Text style={styles.branchToggleTitle}>Create and switch branch first</Text>
            <Text style={styles.branchToggleDetail}>
              Runs git checkout -b {branch.trim() || '<branch>'} before commit + push.
            </Text>
          </View>
        </Pressable>
        <Text style={styles.label}>Commit message</Text>
        <TextInput
          multiline
          style={styles.input}
          value={message}
          onChangeText={setMessage}
        />
        <Button title="Commit + push" disabled={!project} onPress={() => void commit()} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScreenCard>

      {result ? (
        <ScreenCard title="Last result" description="Server response from the last commit-and-push call.">
          <Text style={styles.result}>{result}</Text>
        </ScreenCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  statusCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 12,
    padding: 12,
  },
  title: { color: '#0f172a', fontWeight: '800' },
  line: { color: '#475569', fontSize: 12 },
  error: { color: '#b91c1c', fontSize: 12 },
  label: { color: '#0f172a', fontWeight: '700', marginTop: 8 },
  branchToggle: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    marginTop: 8,
    padding: 12,
  },
  branchToggleActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8',
  },
  branchToggleDisabled: { opacity: 0.55 },
  branchToggleDot: {
    borderColor: '#93c5fd',
    borderRadius: 10,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    height: 20,
    lineHeight: 18,
    textAlign: 'center',
    width: 20,
  },
  branchToggleDotActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  branchToggleText: { flex: 1 },
  branchToggleTitle: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  branchToggleDetail: { color: '#64748b', fontSize: 11, marginTop: 2 },
  input: {
    borderColor: '#d0d7de',
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  status: { color: '#475569', marginTop: 8 },
  result: { color: '#0f172a', fontFamily: 'monospace', fontSize: 11 },
});
