import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Editor from '@monaco-editor/react';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { ScreenCard } from '../components/ScreenCard';
import type { FileContentDto, FileTreeNode, ProjectDto } from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import {
  flattenVisibleTree,
  getDeleteConfirmationCopy,
  getFileTreeRequestOptions,
  mergeFileTreeChildren,
  removeFileTreeNode,
  shouldLoadDirectoryChildren,
  toggleExpandedPath,
  WORKSPACE_ROOT_PATH,
} from './fileTree';
import { getEditorHeight, getMonacoLanguage } from './fileEditor';
import { saveFileContent } from './screenActions';

type FilesScreenProps = {
  apiBaseUrl: string;
  project: ProjectDto | null;
  onRuntimeDirectorySelect?(dir: string): void;
};

type PendingDelete = {
  path: string;
  type: FileTreeNode['type'];
};

export function FilesScreen({ apiBaseUrl, project, onRuntimeDirectorySelect }: FilesScreenProps) {
  const { height: viewportHeight } = useWindowDimensions();
  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [content, setContent] = useState<FileContentDto | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    setExpandedPaths(new Set([WORKSPACE_ROOT_PATH]));
    setContent(null);
    setDraft('');
    if (project) void loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, apiBaseUrl]);

  async function loadTree() {
    if (!project) return;
    try {
      setIsLoading(true);
      const next = await apiClient.listFiles(project.id, getFileTreeRequestOptions());
      setTree(next);
    } catch (error) {
      setStatus(`Load tree failed: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function openFile(path: string) {
    if (!project) return;
    try {
      const result = await apiClient.readFile(project.id, path);
      setContent(result);
      setDraft(result.encoding === 'utf8' ? result.content : '');
      setStatus(
        result.encoding === 'utf8'
          ? `Loaded ${path}`
          : `Loaded ${path} (binary, ${result.size} bytes — preview disabled)`,
      );
    } catch (error) {
      setStatus(`Read failed: ${getErrorMessage(error)}`);
    }
  }

  async function toggleDirectory(item: FileTreeNode) {
    if (!project) return;
    if (item.path === WORKSPACE_ROOT_PATH) {
      setExpandedPaths((current) => toggleExpandedPath(current, item.path));
      return;
    }
    const wasExpanded = expandedPaths.has(item.path);
    setExpandedPaths((current) => toggleExpandedPath(current, item.path));
    if (!shouldLoadDirectoryChildren(item, wasExpanded)) return;
    try {
      setIsLoading(true);
      const children = await apiClient.listFiles(project.id, { dir: item.path });
      setTree((current) => mergeFileTreeChildren(current, item.path, children));
    } catch (error) {
      setStatus(`Load folder failed: ${getErrorMessage(error)}`);
      setExpandedPaths((current) => toggleExpandedPath(current, item.path));
    } finally {
      setIsLoading(false);
    }
  }

  async function deletePath(path: string, type: FileTreeNode['type']) {
    if (!project) return;
    try {
      await apiClient.deleteFile(project.id, path);
      setTree((current) => removeFileTreeNode(current, path));
      setExpandedPaths((current) => {
        const next = new Set<string>();
        for (const expandedPath of current) {
          if (expandedPath !== path && !expandedPath.startsWith(`${path}/`)) {
            next.add(expandedPath);
          }
        }
        return next;
      });
      if (content?.path === path || content?.path.startsWith(`${path}/`)) {
        setContent(null);
        setDraft('');
      }
      setStatus(`Deleted ${type === 'dir' ? 'folder' : 'file'} ${path}.`);
    } catch (error) {
      setStatus(`Delete failed: ${getErrorMessage(error)}`);
    }
  }

  function confirmDelete(path: string, type: FileTreeNode['type']) {
    setPendingDelete({ path, type });
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    await deletePath(target.path, target.type);
  }

  async function save() {
    if (!project || !content) return;
    try {
      const result = await saveFileContent({
        apiClient,
        projectId: project.id,
        form: {
          path: content.path,
          content: draft,
          encoding: 'utf8',
          expectedSha: content.sha,
        },
      });
      setContent({ ...content, sha: result.sha, size: result.size, content: draft });
      setStatus(`Saved ${result.path} (${result.size} bytes)`);
    } catch (error) {
      setStatus(`Save failed: ${getErrorMessage(error)}`);
    }
  }

  function closeFile() {
    setContent(null);
    setDraft('');
  }

  const handleEditorChange = useCallback((value: string | undefined) => {
    setDraft(value ?? '');
  }, []);

  const explorerTree = useMemo((): FileTreeNode[] => {
    if (!project) return [];
    const segments = project.workdir.replace(/\\/g, '/').split('/').filter(Boolean);
    const rootLabel = segments.length ? segments[segments.length - 1]! : project.slug || project.name;
    return [{ name: rootLabel, path: WORKSPACE_ROOT_PATH, type: 'dir', children: tree }];
  }, [project, tree]);

  const flatTree = useMemo(() => flattenVisibleTree(explorerTree, expandedPaths), [explorerTree, expandedPaths]);
  const editorHeight = getEditorHeight(viewportHeight);
  const deleteDialog = (
    <DeleteConfirmationDialog
      target={pendingDelete}
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => void confirmPendingDelete()}
    />
  );

  if (content) {
    return (
      <View style={styles.stack}>
        <ScreenCard
          title={content.path}
          description={`mime: ${content.mime} · size: ${content.size}B · sha: ${content.sha.slice(0, 12)}…`}
        >
          <View style={styles.detailActions}>
            <Button title="Back to files" onPress={closeFile} />
            <Button title="Reload" onPress={() => void openFile(content.path)} />
          </View>
          {content.encoding === 'utf8' ? (
            <View style={[styles.editorShell, { height: editorHeight }]}>
              <Editor
                height={editorHeight}
                language={getMonacoLanguage(content.path, content.mime)}
                path={content.path}
                theme="vs-dark"
                value={draft}
                onChange={handleEditorChange}
                options={{
                  automaticLayout: true,
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </View>
          ) : (
            <Text style={styles.binary}>
              Binary file. Editing not supported in the inline editor.
            </Text>
          )}
          <View style={styles.detailActions}>
            <Button title="Save" disabled={content.encoding !== 'utf8'} onPress={() => void save()} />
            <Button title="Delete" onPress={() => confirmDelete(content.path, 'file')} />
          </View>
        </ScreenCard>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {deleteDialog}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <ScreenCard
        title="Project files"
        description={
          project
            ? `Workspace: ${project.workdir}`
            : 'Pick a project in the Projects tab.'
        }
      >
        <Button
          title={isLoading ? 'Refreshing…' : 'Refresh tree'}
          disabled={!project}
          onPress={() => void loadTree()}
        />
        <FlatList
          data={flatTree}
          scrollEnabled={false}
          keyExtractor={(item) => item.path}
          ListEmptyComponent={<Text style={styles.empty}>No files.</Text>}
          renderItem={({ item }) => {
            const marker =
              item.type === 'dir'
                ? item.isExpanded
                  ? '[-] '
                  : '[+] '
                : '    ';
            const viewItem = () =>
              item.type === 'dir' ? void toggleDirectory(item) : void openFile(item.path);
            return (
              <Pressable
                accessibilityLabel={`View ${item.path}`}
                onPress={viewItem}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={[styles.rowLabel, item.type === 'dir' && styles.dirLabel]}>
                  {''.padStart(item.depth * 2, ' ')}
                  {marker}
                  {item.name}
                </Text>
                <View style={styles.actionGroup}>
                  {item.type === 'dir' ? (
                    <Pressable
                      accessibilityLabel={
                        item.path === WORKSPACE_ROOT_PATH
                          ? `Start Docker at workspace root (${project?.workdir ?? ''})`
                          : `Start Docker from ${item.path}`
                      }
                      onPress={(event) => {
                        event.stopPropagation();
                        onRuntimeDirectorySelect?.(
                          item.path === WORKSPACE_ROOT_PATH ? WORKSPACE_ROOT_PATH : item.path,
                        );
                      }}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.iconButtonPressed,
                      ]}
                    >
                      <ActionIcon kind="docker" />
                    </Pressable>
                  ) : null}
                  {item.path === WORKSPACE_ROOT_PATH ? null : (
                    <Pressable
                      accessibilityLabel={`Delete ${item.path}`}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmDelete(item.path, item.type);
                      }}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.iconButtonPressed,
                      ]}
                    >
                      <ActionIcon kind="delete" />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </ScreenCard>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {deleteDialog}
    </View>
  );
}

type DeleteConfirmationDialogProps = {
  target: PendingDelete | null;
  onCancel(): void;
  onConfirm(): void;
};

function DeleteConfirmationDialog({ target, onCancel, onConfirm }: DeleteConfirmationDialogProps) {
  if (!target) return null;
  const copy = getDeleteConfirmationCopy(target.path, target.type);

  return (
    <Modal
      animationType="fade"
      transparent
      visible
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconShell}>
            <Text style={styles.modalIconMark}>!</Text>
          </View>
          <Text style={styles.modalTitle}>{copy.title}</Text>
          <Text style={styles.modalMessage}>{copy.message}</Text>
          <Text style={styles.modalHint}>This action cannot be undone.</Text>
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.modalButton, styles.cancelButton, pressed && styles.modalButtonPressed]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [styles.modalButton, styles.confirmButton, pressed && styles.modalButtonPressed]}
            >
              <Text style={styles.confirmButtonText}>{copy.confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type ActionIconProps = {
  kind: 'delete' | 'docker';
};

function ActionIcon({ kind }: ActionIconProps) {
  if (kind === 'docker') {
    return (
      <View style={styles.dockerIcon}>
        <View style={styles.dockerStack}>
          <View style={styles.dockerBox} />
          <View style={styles.dockerBox} />
          <View style={styles.dockerBox} />
        </View>
        <View style={styles.dockerHull} />
      </View>
    );
  }

  return (
    <View style={styles.trashIcon}>
      <View style={styles.trashLid} />
      <View style={styles.trashCan}>
        <View style={styles.trashLine} />
        <View style={styles.trashLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  row: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    padding: 8,
  },
  rowPressed: { backgroundColor: '#eef2ff' },
  rowLabel: { color: '#0f172a', flex: 1, fontFamily: 'monospace', fontSize: 12 },
  dirLabel: { color: '#1e293b', fontWeight: '700' },
  actionGroup: { flexDirection: 'row', gap: 12, marginLeft: 10 },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    minWidth: 24,
  },
  iconButtonPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.92 }],
  },
  trashIcon: {
    alignItems: 'center',
    height: 14,
    justifyContent: 'center',
    width: 14,
  },
  trashLid: {
    backgroundColor: '#e11d48',
    borderRadius: 2,
    height: 2,
    marginBottom: 1.5,
    width: 11,
  },
  trashCan: {
    alignItems: 'center',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderColor: '#e11d48',
    borderTopWidth: 0,
    borderWidth: 1.6,
    flexDirection: 'row',
    gap: 2,
    height: 10,
    justifyContent: 'center',
    width: 9,
  },
  trashLine: {
    backgroundColor: '#e11d48',
    borderRadius: 1,
    height: 5,
    width: 1,
  },
  dockerIcon: {
    alignItems: 'center',
    height: 14,
    justifyContent: 'center',
    width: 14,
  },
  dockerStack: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 1,
  },
  dockerBox: {
    backgroundColor: '#0ea5e9',
    borderRadius: 1,
    height: 3,
    width: 3,
  },
  dockerHull: {
    backgroundColor: '#0284c7',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    height: 6,
    width: 13,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  editorShell: {
    borderColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  binary: { color: '#64748b', marginVertical: 12 },
  empty: { color: '#64748b', marginTop: 12 },
  status: { color: '#475569', marginTop: 8 },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fee2e2',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 360,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    width: '100%',
  },
  modalIconShell: {
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginBottom: 14,
    width: 44,
  },
  modalIconMark: { color: '#e11d48', fontSize: 24, fontWeight: '900', lineHeight: 28 },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modalMessage: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  modalHint: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  modalButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalButtonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  cancelButton: { backgroundColor: '#f1f5f9' },
  confirmButton: { backgroundColor: '#e11d48' },
  cancelButtonText: { color: '#334155', fontSize: 14, fontWeight: '800' },
  confirmButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
