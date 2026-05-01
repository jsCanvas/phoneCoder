import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  FlatList,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputSelectionChangeEventData,
  View,
} from 'react-native';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { AgentTimeline } from '../components/AgentTimeline';
import { ScreenCard } from '../components/ScreenCard';
import {
  buildSlashSuggestions,
  buildMentionSuggestions,
  getActiveMention,
  getActiveSlashCommand,
  insertMention,
  insertSlashSuggestion,
  type MentionSuggestion,
  type SlashSuggestion,
} from '../chat/chatMentions';
import { buildSendMessageInput, type UploadedAttachment } from '../chat/chatPayload';
import { useAgentSession } from '../hooks/useAgentSession';
import { imageAssetToMultipartFile } from './chatAttachments';
import type {
  FileTreeNode,
  McpServerDto,
  MessageDto,
  ProjectDto,
  SessionDto,
  SkillDto,
} from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import { ensureChatSession, selectSession } from './screenActions';
import type { SettingsStorage } from '../storage/settingsStorage';

type ChatScreenProps = {
  apiBaseUrl: string;
  storage: SettingsStorage;
  project: ProjectDto | null;
  selectedSessionId?: string;
  onSessionChange(sessionId: string): void;
};

export function ChatScreen({
  apiBaseUrl,
  storage,
  project,
  selectedSessionId,
  onSessionChange,
}: ChatScreenProps) {
  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [history, setHistory] = useState<MessageDto[]>([]);
  const [skills, setSkills] = useState<SkillDto[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerDto[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [enabledMcps, setEnabledMcps] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [mentionFiles, setMentionFiles] = useState<FileTreeNode[]>([]);
  const [status, setStatus] = useState('');

  const { state, send, stop } = useAgentSession({
    apiClient,
    sessionId: selectedSessionId ?? null,
  });

  useEffect(() => {
    if (!project) {
      setMentionFiles([]);
      return;
    }
    void loadSessions();
    void loadCatalogs();
    void loadMentionFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, apiBaseUrl]);

  useEffect(() => {
    if (selectedSessionId) {
      void loadHistory(selectedSessionId);
    } else {
      setHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, apiBaseUrl]);

  async function loadSessions() {
    if (!project) return;
    try {
      const list = await apiClient.listSessions(project.id);
      setSessions(list);
    } catch (error) {
      setStatus(`Load sessions failed: ${getErrorMessage(error)}`);
    }
  }

  async function loadCatalogs() {
    try {
      const [s, m] = await Promise.all([apiClient.listSkills(), apiClient.listMcpServers()]);
      setSkills(s);
      setMcpServers(m);
    } catch (error) {
      setStatus(`Load skills/mcp failed: ${getErrorMessage(error)}`);
    }
  }

  async function loadMentionFiles() {
    if (!project) return;
    try {
      setMentionFiles(await apiClient.listFiles(project.id));
    } catch (error) {
      setStatus(`Load file mentions failed: ${getErrorMessage(error)}`);
    }
  }

  async function loadHistory(sessionId: string) {
    try {
      setHistory(await apiClient.listMessages(sessionId));
    } catch (error) {
      setStatus(`Load history failed: ${getErrorMessage(error)}`);
    }
  }

  async function startNewSession() {
    if (!project) return;
    try {
      const created = await ensureChatSession({
        apiClient,
        storage,
        projectId: project.id,
        title: `Chat ${new Date().toLocaleString()}`,
      });
      onSessionChange(created.id);
      await loadSessions();
    } catch (error) {
      setStatus(`Create session failed: ${getErrorMessage(error)}`);
    }
  }

  async function pickSession(id: string) {
    try {
      await selectSession({ storage, sessionId: id });
      onSessionChange(id);
    } catch (error) {
      setStatus(`Pick session failed: ${getErrorMessage(error)}`);
    }
  }

  async function pickImage() {
    if (!project) {
      setStatus('Select a project first.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const file = await imageAssetToMultipartFile(asset, attachments.length + 1);
      const uploaded = await apiClient.uploadAttachment(project.id, file);
      setAttachments((curr) => [...curr, { id: uploaded.id, name: uploaded.filename }]);
      setStatus(`Uploaded ${uploaded.filename}`);
    } catch (error) {
      setStatus(`Upload failed: ${getErrorMessage(error)}`);
    }
  }

  function toggleSkill(name: string) {
    setEnabledSkills((curr) =>
      curr.includes(name) ? curr.filter((n) => n !== name) : [...curr, name],
    );
  }

  function toggleMcp(name: string) {
    setEnabledMcps((curr) =>
      curr.includes(name) ? curr.filter((n) => n !== name) : [...curr, name],
    );
  }

  const activeMention = useMemo(
    () => getActiveMention(text, selection.start),
    [selection.start, text],
  );
  const activeSlashCommand = useMemo(
    () => (activeMention ? null : getActiveSlashCommand(text, selection.start)),
    [activeMention, selection.start, text],
  );
  const mentionSuggestions = useMemo(
    () =>
      activeMention
        ? buildMentionSuggestions({
            query: activeMention.query,
            files: mentionFiles,
            attachments,
          })
        : [],
    [activeMention, attachments, mentionFiles],
  );
  const slashSuggestions = useMemo(
    () =>
      activeSlashCommand
        ? buildSlashSuggestions({
            query: activeSlashCommand.query,
            skills,
          })
        : [],
    [activeSlashCommand, skills],
  );

  function handleSelectionChange(
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) {
    setSelection(event.nativeEvent.selection);
  }

  function selectMention(suggestion: MentionSuggestion) {
    if (!activeMention) return;
    const inserted = insertMention({ text, mention: activeMention, value: suggestion.value });
    setText(inserted.text);
    setSelection({ start: inserted.cursor, end: inserted.cursor });
  }

  function selectSlashSuggestion(suggestion: SlashSuggestion) {
    if (!activeSlashCommand) return;
    const inserted = insertSlashSuggestion({
      text,
      command: activeSlashCommand,
      value: suggestion.value,
    });
    setText(inserted.text);
    setSelection({ start: inserted.cursor, end: inserted.cursor });
  }

  async function sendMessage() {
    if (!project) {
      setStatus('Select a project first.');
      return;
    }
    if (!selectedSessionId) {
      setStatus('Start a session first.');
      return;
    }
    if (!text.trim() && attachments.length === 0) {
      setStatus('Empty message.');
      return;
    }
    try {
      const payload = buildSendMessageInput({ text, attachments });
      const skillUnion = unique([...payload.skills ?? [], ...enabledSkills]);
      const mcpUnion = unique([...payload.mcpServers ?? [], ...enabledMcps]);
      await send({
        ...payload,
        skills: skillUnion,
        mcpServers: mcpUnion,
        abortPrevious: true,
      });
      setText('');
      setAttachments([]);
      await loadHistory(selectedSessionId);
      setStatus('Run completed.');
    } catch (error) {
      setStatus(`Send failed: ${getErrorMessage(error)}`);
    }
  }

  async function abort() {
    stop();
    if (selectedSessionId) {
      try {
        await apiClient.abortSession(selectedSessionId);
        setStatus('Aborted.');
      } catch (error) {
        setStatus(`Abort failed: ${getErrorMessage(error)}`);
      }
    }
  }

  return (
    <View style={styles.stack}>
      <ScreenCard
        title="Conversation"
        description={
          project
            ? `Active project: ${project.name} (${project.status}). Each session is a multi-turn run.`
            : 'Pick a project in the Projects tab to start chatting.'
        }
      >
        <View style={styles.row}>
          <Button title="New session" disabled={!project} onPress={() => void startNewSession()} />
          <Button
            title="Refresh"
            disabled={!project}
            onPress={() => void Promise.all([loadSessions(), loadCatalogs()])}
          />
        </View>
        <FlatList
          data={sessions}
          horizontal
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sessionList}
          ListEmptyComponent={<Text style={styles.empty}>No sessions yet.</Text>}
          renderItem={({ item }) => {
            const active = item.id === selectedSessionId;
            return (
              <Pressable
                onPress={() => void pickSession(item.id)}
                style={[styles.sessionPill, active && styles.activePill]}
              >
                <Text style={[styles.sessionText, active && styles.activeText]}>
                  {item.title}
                </Text>
              </Pressable>
            );
          }}
        />
      </ScreenCard>

      <ScreenCard
        title="Compose"
        description="Describe requirements. Use @image, @file.txt, @dir/, /skill, /mcp."
      >
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          onSelectionChange={handleSelectionChange}
          placeholder="Build me a fullstack TODO app with a postgres backend…"
          selection={selection}
          style={styles.input}
        />
        {mentionSuggestions.length > 0 ? (
          <View style={styles.mentionPanel}>
            {mentionSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.id}
                onPress={() => selectMention(suggestion)}
                style={styles.mentionOption}
              >
                <Text style={styles.mentionKind}>{mentionKindLabel(suggestion.kind)}</Text>
                <View style={styles.mentionText}>
                  <Text style={styles.mentionLabel}>{suggestion.label}</Text>
                  <Text style={styles.mentionValue}>@{suggestion.value}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {slashSuggestions.length > 0 ? (
          <View style={styles.mentionPanel}>
            {slashSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.id}
                onPress={() => selectSlashSuggestion(suggestion)}
                style={styles.mentionOption}
              >
                <Text style={styles.mentionKind}>SKILL</Text>
                <View style={styles.mentionText}>
                  <Text style={styles.mentionLabel}>
                    {suggestion.label}
                    {suggestion.isBuiltin ? ' · builtin' : ''}
                  </Text>
                  <Text style={styles.mentionValue}>{suggestion.description}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {attachments.length > 0 ? (
          <View style={styles.attachmentRow}>
            {attachments.map((a) => (
              <Text key={a.id} style={styles.attachmentChip}>
                @{a.name}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.row}>
          <Button title="Upload image" disabled={!project} onPress={() => void pickImage()} />
          <Button
            title={state.status === 'running' ? 'Streaming…' : 'Send'}
            disabled={!project || !selectedSessionId || state.status === 'running'}
            onPress={() => void sendMessage()}
          />
          <Button title="Stop" disabled={state.status !== 'running'} onPress={() => void abort()} />
        </View>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScreenCard>

      <ScreenCard
        title="Context toggles"
        description="Enable skills and MCP servers for this run. Active items are sent in addition to inline /skill, /mcp tokens."
      >
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.chipRow}>
          {skills.length === 0 ? (
            <Text style={styles.empty}>No skills configured.</Text>
          ) : (
            skills.map((skill) => {
              const active = enabledSkills.includes(skill.name);
              return (
                <Pressable
                  key={skill.id}
                  onPress={() => toggleSkill(skill.name)}
                  style={[styles.chip, active && styles.activeChip]}
                >
                  <Text style={[styles.chipText, active && styles.activeChipText]}>
                    {skill.name}
                    {skill.isBuiltin ? ' · builtin' : ''}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
        <Text style={styles.sectionTitle}>MCP servers</Text>
        <View style={styles.chipRow}>
          {mcpServers.length === 0 ? (
            <Text style={styles.empty}>No MCP servers configured.</Text>
          ) : (
            mcpServers.map((mcp) => {
              const active = enabledMcps.includes(mcp.name);
              return (
                <Pressable
                  key={mcp.id}
                  onPress={() => toggleMcp(mcp.name)}
                  style={[styles.chip, active && styles.activeChip]}
                >
                  <Text style={[styles.chipText, active && styles.activeChipText]}>
                    {mcp.name} · {mcp.transport}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScreenCard>

      <ScreenCard
        title="Live stream"
        description="Streaming output from the active session run."
      >
        <AgentTimeline state={state} />
      </ScreenCard>

      <ScreenCard title="History" description="Persisted messages for this session.">
        <FlatList
          data={history}
          scrollEnabled={false}
          keyExtractor={(m) => m.id}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.message}>
              <Text style={styles.messageRole}>{item.role}</Text>
              <Text style={styles.messageContent}>{stringify(item.content)}</Text>
            </View>
          )}
        />
      </ScreenCard>
    </View>
  );
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

function stringify(content: unknown): string {
  if (typeof content === 'string') return content;
  return JSON.stringify(content, null, 2);
}

function mentionKindLabel(kind: MentionSuggestion['kind']): string {
  if (kind === 'directory') return 'DIR';
  if (kind === 'image') return 'IMG';
  return 'FILE';
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 6 },
  input: {
    borderColor: '#d0d7de',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
  },
  mentionPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    marginTop: 8,
    padding: 6,
  },
  mentionOption: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mentionKind: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    color: '#3730a3',
    fontSize: 10,
    fontWeight: '900',
    minWidth: 34,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textAlign: 'center',
  },
  mentionText: { flex: 1 },
  mentionLabel: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  mentionValue: { color: '#64748b', fontFamily: 'monospace', fontSize: 11, marginTop: 2 },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  attachmentChip: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    color: '#3730a3',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  status: { color: '#475569', marginTop: 8 },
  sessionList: { gap: 8, paddingVertical: 8 },
  sessionPill: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activePill: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  sessionText: { color: '#1e293b', fontWeight: '600' },
  activeText: { color: '#3730a3' },
  empty: { color: '#64748b' },
  sectionTitle: { color: '#1e293b', fontSize: 13, fontWeight: '800', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeChip: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  chipText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  activeChipText: { color: '#3730a3' },
  message: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    gap: 4,
    marginTop: 8,
    padding: 10,
  },
  messageRole: { color: '#1e293b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  messageContent: { color: '#0f172a' },
});
