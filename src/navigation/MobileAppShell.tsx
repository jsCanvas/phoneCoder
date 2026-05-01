import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { ChatScreen } from '../screens/ChatScreen';
import { FilesScreen } from '../screens/FilesScreen';
import { GitPlanScreen } from '../screens/GitPlanScreen';
import { PreviewScreen } from '../screens/PreviewScreen';
import { ProjectSetupScreen } from '../screens/ProjectSetupScreen';
import { RuntimePreviewOverlay } from '../screens/RuntimePreviewOverlay';
import { SettingsScreen } from '../screens/SettingsScreen';
import {
  closeRuntimePreview,
  type RuntimePreviewWindowState,
} from '../screens/runtimePreviewWindow';
import { SettingsStorage } from '../storage/settingsStorage';
import type { ProjectDto } from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import { getMobileTabs, type MobileTabKey } from './mobileTabs';

const tabs = getMobileTabs();

type MobileAppShellProps = {
  initialApiBaseUrl: string;
};

export function MobileAppShell({ initialApiBaseUrl }: MobileAppShellProps) {
  const storage = useMemo(() => new SettingsStorage(), []);
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [activeTab, setActiveTab] = useState<MobileTabKey>('settings');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [runtimeDirectory, setRuntimeDirectory] = useState<string | undefined>(undefined);
  const [runtimePreviewWindow, setRuntimePreviewWindow] = useState<RuntimePreviewWindowState>(
    closeRuntimePreview(),
  );
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [shellStatus, setShellStatus] = useState('');

  // Restore persisted settings on mount.
  useEffect(() => {
    void (async () => {
      const persisted = await storage.load();
      if (!persisted) return;
      if (persisted.apiBaseUrl) setApiBaseUrl(persisted.apiBaseUrl);
      if (persisted.selectedProjectId) setSelectedProjectId(persisted.selectedProjectId);
      if (persisted.selectedSessionId) setSelectedSessionId(persisted.selectedSessionId);
    })();
  }, [storage]);

  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);

  // Hydrate the active project whenever it or the API URL changes.
  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiClient.getProject(selectedProjectId);
        if (!cancelled) setProject(next);
      } catch (error) {
        if (!cancelled) {
          setProject(null);
          setShellStatus(`Active project unavailable: ${getErrorMessage(error)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, apiClient]);

  const activeConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>phoneBot</Text>
          <Text style={styles.heading}>{activeConfig.title}</Text>
          <Text style={styles.subheading}>{activeConfig.description}</Text>
          {project ? (
            <Text style={styles.projectBadge}>
              project: {project.name} · {project.status}
            </Text>
          ) : (
            <Text style={styles.projectBadge}>no active project</Text>
          )}
          {shellStatus ? <Text style={styles.shellStatus}>{shellStatus}</Text> : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {renderActiveScreen({
            activeTab,
            apiBaseUrl,
            storage,
            project,
            selectedSessionId,
            onApiBaseUrlChange: setApiBaseUrl,
            onProjectChange: (pid) => {
              setSelectedProjectId(pid);
              setSelectedSessionId(undefined);
              setRuntimeDirectory(undefined);
              setRuntimePreviewWindow(closeRuntimePreview());
            },
            onSessionChange: setSelectedSessionId,
            onRuntimeDirectorySelect: (dir) => {
              setRuntimeDirectory(dir);
              setActiveTab('preview');
            },
            runtimeDirectory,
            runtimePreviewWindow,
            onRuntimePreviewWindowChange: setRuntimePreviewWindow,
          })}
        </ScrollView>

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabIcon, isActive && styles.activeTabText]}>
                  {tab.label.slice(0, 1)}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <RuntimePreviewOverlay
          state={runtimePreviewWindow}
          onChange={setRuntimePreviewWindow}
        />
      </View>
    </SafeAreaView>
  );
}

type RenderArgs = {
  activeTab: MobileTabKey;
  apiBaseUrl: string;
  storage: SettingsStorage;
  project: ProjectDto | null;
  selectedSessionId?: string;
  runtimeDirectory?: string;
  runtimePreviewWindow: RuntimePreviewWindowState;
  onApiBaseUrlChange(value: string): void;
  onProjectChange(projectId: string): void;
  onSessionChange(sessionId: string): void;
  onRuntimeDirectorySelect(dir: string): void;
  onRuntimePreviewWindowChange(state: RuntimePreviewWindowState): void;
};

function renderActiveScreen(args: RenderArgs) {
  switch (args.activeTab) {
    case 'settings':
      return (
        <SettingsScreen
          apiBaseUrl={args.apiBaseUrl}
          onApiBaseUrlChange={args.onApiBaseUrlChange}
          storage={args.storage}
        />
      );
    case 'project':
      return (
        <ProjectSetupScreen
          apiBaseUrl={args.apiBaseUrl}
          storage={args.storage}
          selectedProjectId={args.project?.id}
          onProjectChange={args.onProjectChange}
        />
      );
    case 'chat':
      return (
        <ChatScreen
          apiBaseUrl={args.apiBaseUrl}
          storage={args.storage}
          project={args.project}
          selectedSessionId={args.selectedSessionId}
          onSessionChange={args.onSessionChange}
        />
      );
    case 'files':
      return (
        <FilesScreen
          apiBaseUrl={args.apiBaseUrl}
          project={args.project}
          onRuntimeDirectorySelect={args.onRuntimeDirectorySelect}
        />
      );
    case 'preview':
      return (
        <PreviewScreen
          apiBaseUrl={args.apiBaseUrl}
          project={args.project}
          runtimeDirectory={args.runtimeDirectory}
          previewWindow={args.runtimePreviewWindow}
          onPreviewWindowChange={args.onRuntimePreviewWindowChange}
        />
      );
    case 'git':
      return <GitPlanScreen apiBaseUrl={args.apiBaseUrl} project={args.project} />;
  }
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#eef2ff', flex: 1 },
  app: { backgroundColor: '#eef2ff', flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 18 },
  eyebrow: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heading: { color: '#0f172a', fontSize: 28, fontWeight: '900', marginTop: 6 },
  subheading: { color: '#475569', fontSize: 14, lineHeight: 20, marginTop: 6 },
  projectBadge: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  shellStatus: { color: '#b91c1c', fontSize: 12, marginTop: 4 },
  content: { paddingBottom: 112, paddingHorizontal: 16 },
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    left: 0,
    paddingBottom: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  tab: { alignItems: 'center', borderRadius: 18, flex: 1, paddingVertical: 8 },
  activeTab: { backgroundColor: '#eef2ff' },
  tabIcon: { color: '#64748b', fontSize: 16, fontWeight: '900' },
  tabLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 2 },
  activeTabText: { color: '#4f46e5' },
});
