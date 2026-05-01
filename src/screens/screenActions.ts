import type { PhoneBotApiClient } from '../api/phoneBotApi';
import type { SettingsStorage } from '../storage/settingsStorage';
import type {
  CreateMcpServerInput,
  CreateModelConfigInput,
  CreateProjectInput,
  CreateSkillInput,
  ModelConfigDto,
  ProjectDto,
  SessionDto,
  UpdateMcpServerInput,
  UpdateModelConfigInput,
  UpdateSkillInput,
  WriteFileInput,
} from '../types/api';

// ─── Settings ──────────────────────────────────────────────────────────────
export type SettingsTopForm = {
  apiBaseUrl: string;
};

export async function saveApiBaseUrl(input: {
  storage: SettingsStorage;
  apiBaseUrl: string;
}): Promise<void> {
  await input.storage.patch({ apiBaseUrl: input.apiBaseUrl });
}

export async function createModelConfigFromForm(input: {
  apiClient: PhoneBotApiClient;
  storage: SettingsStorage;
  form: CreateModelConfigInput;
}): Promise<ModelConfigDto> {
  const created = await input.apiClient.createModelConfig({
    ...input.form,
    activate: input.form.activate ?? true,
  });
  if (created.isActive) {
    await input.storage.patch({ activeModelConfigId: created.id });
  }
  return created;
}

export async function updateModelConfigFromForm(input: {
  apiClient: PhoneBotApiClient;
  id: string;
  patch: UpdateModelConfigInput;
}): Promise<ModelConfigDto> {
  return input.apiClient.updateModelConfig(input.id, input.patch);
}

export async function activateModelConfig(input: {
  apiClient: PhoneBotApiClient;
  storage: SettingsStorage;
  id: string;
}): Promise<ModelConfigDto> {
  const result = await input.apiClient.activateModelConfig(input.id);
  await input.storage.patch({ activeModelConfigId: result.id });
  return result;
}

// ─── Projects ──────────────────────────────────────────────────────────────
export async function createProjectFromForm(input: {
  apiClient: PhoneBotApiClient;
  storage: SettingsStorage;
  form: CreateProjectInput;
}): Promise<ProjectDto> {
  const project = await input.apiClient.createProject(input.form);
  await input.storage.patch({ selectedProjectId: project.id });
  return project;
}

export async function selectProject(input: {
  storage: SettingsStorage;
  projectId: string;
}): Promise<void> {
  await input.storage.patch({ selectedProjectId: input.projectId, selectedSessionId: undefined });
}

// ─── Sessions ──────────────────────────────────────────────────────────────
export async function ensureChatSession(input: {
  apiClient: PhoneBotApiClient;
  storage: SettingsStorage;
  projectId: string;
  preferredSessionId?: string;
  title?: string;
}): Promise<SessionDto> {
  if (input.preferredSessionId) {
    const sessions = await input.apiClient.listSessions(input.projectId);
    const match = sessions.find((s) => s.id === input.preferredSessionId);
    if (match) return match;
  }
  const created = await input.apiClient.createSession(input.projectId, input.title);
  await input.storage.patch({ selectedSessionId: created.id });
  return created;
}

export async function selectSession(input: {
  storage: SettingsStorage;
  sessionId: string;
}): Promise<void> {
  await input.storage.patch({ selectedSessionId: input.sessionId });
}

// ─── Skills ────────────────────────────────────────────────────────────────
export async function createSkill(input: {
  apiClient: PhoneBotApiClient;
  form: CreateSkillInput;
}) {
  return input.apiClient.createSkill(input.form);
}

export async function updateSkill(input: {
  apiClient: PhoneBotApiClient;
  id: string;
  patch: UpdateSkillInput;
}) {
  return input.apiClient.updateSkill(input.id, input.patch);
}

// ─── MCP servers ───────────────────────────────────────────────────────────
export async function createMcpServer(input: {
  apiClient: PhoneBotApiClient;
  form: CreateMcpServerInput;
}) {
  return input.apiClient.createMcpServer(input.form);
}

export async function updateMcpServer(input: {
  apiClient: PhoneBotApiClient;
  id: string;
  patch: UpdateMcpServerInput;
}) {
  return input.apiClient.updateMcpServer(input.id, input.patch);
}

// ─── Files ─────────────────────────────────────────────────────────────────
export async function saveFileContent(input: {
  apiClient: PhoneBotApiClient;
  projectId: string;
  form: WriteFileInput;
}) {
  return input.apiClient.writeFile(input.projectId, input.form);
}

// ─── Runtime ───────────────────────────────────────────────────────────────
export async function startRuntimeAndOpen(input: {
  apiClient: PhoneBotApiClient;
  projectId: string;
  composePath?: string;
  openUrl(url: string): Promise<void> | void;
}) {
  const runtime = await input.apiClient.runtimeUp(
    input.projectId,
    input.composePath ? { composePath: input.composePath } : undefined,
  );
  if (runtime.preview_url) {
    await input.openUrl(runtime.preview_url);
  }
  return runtime;
}

// ─── Git ───────────────────────────────────────────────────────────────────
export function commitAndPushProject(input: {
  apiClient: PhoneBotApiClient;
  projectId: string;
  message: string;
  branch?: string;
  checkoutBranch?: boolean;
}) {
  return input.apiClient.gitCommitAndPush(input.projectId, {
    message: input.message,
    addAll: true,
    branch: input.branch,
    ...(input.checkoutBranch ? { checkoutBranch: true } : {}),
  });
}
