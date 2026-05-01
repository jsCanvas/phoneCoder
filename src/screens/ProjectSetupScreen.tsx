import { useEffect, useMemo, useState } from 'react';
import { Button, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { FormField } from '../components/FormField';
import { ScreenCard } from '../components/ScreenCard';
import type { ProjectDto } from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import { createProjectFromForm, selectProject } from './screenActions';
import type { SettingsStorage } from '../storage/settingsStorage';

type ProjectSetupScreenProps = {
  apiBaseUrl: string;
  storage: SettingsStorage;
  selectedProjectId?: string;
  onProjectChange(projectId: string): void;
};

export function ProjectSetupScreen({
  apiBaseUrl,
  storage,
  selectedProjectId,
  onProjectChange,
}: ProjectSetupScreenProps) {
  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  async function loadProjects() {
    try {
      setIsLoading(true);
      setProjects(await apiClient.listProjects());
    } catch (error) {
      setStatus(`Load projects failed: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function create() {
    if (!name.trim()) {
      setStatus('Project name is required.');
      return;
    }
    try {
      const project = await createProjectFromForm({
        apiClient,
        storage,
        form: {
          name,
          slug: slug || undefined,
          gitUrl: gitUrl || undefined,
          gitToken: gitToken || undefined,
          defaultBranch,
        },
      });
      setStatus(`Project created: ${project.id} (${project.status})`);
      onProjectChange(project.id);
      setName('');
      setSlug('');
      setGitUrl('');
      setGitToken('');
      await loadProjects();
    } catch (error) {
      setStatus(`Create failed: ${getErrorMessage(error)}`);
    }
  }

  async function pick(projectId: string) {
    try {
      await selectProject({ storage, projectId });
      onProjectChange(projectId);
      setStatus(`Selected project ${projectId}`);
    } catch (error) {
      setStatus(`Select failed: ${getErrorMessage(error)}`);
    }
  }

  async function remove(projectId: string) {
    try {
      await apiClient.deleteProject(projectId);
      setStatus('Project deleted');
      await loadProjects();
    } catch (error) {
      setStatus(`Delete failed: ${getErrorMessage(error)}`);
    }
  }

  return (
    <View style={styles.stack}>
      <ScreenCard
        title="Create project"
        description="Provide a Git URL and token to clone into the server workspace, or omit Git fields to start blank."
      >
        <FormField label="Name" value={name} onChangeText={setName} placeholder="my-app" />
        <FormField label="Slug (optional)" value={slug} onChangeText={setSlug} placeholder="auto from name" />
        <FormField
          label="Git URL"
          value={gitUrl}
          onChangeText={setGitUrl}
          placeholder="https://github.com/org/repo.git"
        />
        <FormField label="Git Token" value={gitToken} secureTextEntry onChangeText={setGitToken} />
        <FormField label="Default branch" value={defaultBranch} onChangeText={setDefaultBranch} />
        <Button title="Create / clone" onPress={() => void create()} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScreenCard>

      <ScreenCard
        title="Projects"
        description={isLoading ? 'Loading…' : 'Tap a card to make it the active project for chat / files / preview.'}
      >
        <Button title={isLoading ? 'Refreshing…' : 'Refresh'} onPress={() => void loadProjects()} />
        <FlatList
          data={projects}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No projects yet.</Text>}
          renderItem={({ item }) => {
            const selected = item.id === selectedProjectId;
            return (
              <Pressable
                onPress={() => void pick(item.id)}
                style={[styles.projectRow, selected && styles.activeRow]}
              >
                <View style={styles.projectMeta}>
                  <Text style={styles.projectName}>
                    {item.name}
                    {selected ? ' · selected' : ''}
                  </Text>
                  <Text style={styles.projectDetail}>slug: {item.slug}</Text>
                  <Text style={styles.projectDetail}>status: {item.status}</Text>
                  {item.gitUrl ? <Text style={styles.projectDetail}>git: {item.gitUrl}</Text> : null}
                  {item.previewUrl ? (
                    <Text style={styles.projectDetail}>preview: {item.previewUrl}</Text>
                  ) : null}
                  {item.lastError ? (
                    <Text style={styles.projectError}>error: {item.lastError}</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => void remove(item.id)} style={[styles.actionPill, styles.danger]}>
                  <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      </ScreenCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  status: { marginTop: 12 },
  empty: { color: '#64748b', marginTop: 12 },
  projectRow: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    padding: 12,
  },
  activeRow: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  projectMeta: { flex: 1, gap: 2 },
  projectName: { color: '#0f172a', fontWeight: '700' },
  projectDetail: { color: '#475569', fontSize: 12 },
  projectError: { color: '#b91c1c', fontSize: 12 },
  actionPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: { color: '#1e293b', fontSize: 12, fontWeight: '700' },
  danger: { borderColor: '#fca5a5' },
  dangerText: { color: '#b91c1c' },
});
