import type {
  AttachmentDto,
  CreateMcpServerInput,
  CreateModelConfigInput,
  CreateProjectInput,
  CreateSkillInput,
  FileContentDto,
  FileTreeNode,
  GitCommitAndPushInput,
  GitCommitAndPushResult,
  GitCommitInput,
  GitCommitResult,
  GitPushInput,
  GitPushResult,
  GitStatusDto,
  HealthDto,
  McpServerDto,
  MessageDto,
  ModelConfigDto,
  ModelConfigProbeResult,
  ModelProviderDto,
  ProjectDto,
  RuntimeDto,
  RuntimeUpInput,
  SessionDto,
  SkillDto,
  UpdateMcpServerInput,
  UpdateModelConfigInput,
  UpdateSkillInput,
  WriteFileInput,
  WriteFileResult,
} from '../types/api';

type FetchResponseLike = {
  ok: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;

/**
 * Multipart-equivalent payload that the API client converts into a
 * FormData object. Keeping it abstract lets us pass simple JS objects
 * from the chat screen without the screen importing FormData directly.
 */
export type MultipartFile = {
  name: string;
  mimeType: string;
  /** Either a `Blob` (web) or a `{ uri: string }` (RN) descriptor. */
  source: Blob | { uri: string };
};

export class PhoneBotApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'PhoneBotApiError';
  }
}

export class PhoneBotApiClient {
  private readonly fetcher: FetchLike;

  constructor(
    private readonly baseUrl: string,
    fetcher?: FetchLike,
  ) {
    this.fetcher =
      fetcher ?? ((input, init) => globalThis.fetch(input, init) as unknown as Promise<FetchResponseLike>);
  }

  /** Effective `<base>/api` URL used for SSE endpoints. */
  resolve(path: string): string {
    return this.url(path);
  }

  // ─── Health ───────────────────────────────────────────────────────────
  health(): Promise<HealthDto> {
    return this.get<HealthDto>('health');
  }

  // ─── Model configs ────────────────────────────────────────────────────
  listModelConfigs() {
    return this.get<ModelConfigDto[]>('model-configs');
  }

  listModelProviders() {
    return this.get<ModelProviderDto[]>('model-configs/providers');
  }

  createModelConfig(input: CreateModelConfigInput) {
    return this.post<ModelConfigDto>('model-configs', input);
  }

  updateModelConfig(id: string, input: UpdateModelConfigInput) {
    return this.patch<ModelConfigDto>(`model-configs/${id}`, input);
  }

  deleteModelConfig(id: string) {
    return this.delete<void>(`model-configs/${id}`);
  }

  activateModelConfig(id: string) {
    return this.post<ModelConfigDto>(`model-configs/${id}/activate`, {});
  }

  testModelConfig(id: string) {
    return this.post<ModelConfigProbeResult>(`model-configs/${id}/test`, {});
  }

  // ─── Projects ─────────────────────────────────────────────────────────
  listProjects() {
    return this.get<ProjectDto[]>('projects');
  }

  getProject(id: string) {
    return this.get<ProjectDto>(`projects/${id}`);
  }

  createProject(input: CreateProjectInput) {
    return this.post<ProjectDto>('projects', input);
  }

  deleteProject(id: string) {
    return this.delete<void>(`projects/${id}`);
  }

  // ─── Files ────────────────────────────────────────────────────────────
  async listFiles(projectId: string, opts?: { dir?: string; depth?: number }) {
    const qs = new URLSearchParams();
    if (opts?.dir) qs.set('path', opts.dir);
    if (opts?.depth != null) qs.set('depth', String(opts.depth));
    const suffix = qs.toString() ? `?${qs}` : '';
    const root = await this.get<FileTreeNode>(`projects/${projectId}/files${suffix}`);
    return root.children ?? [];
  }

  readFile(projectId: string, path: string) {
    const qs = new URLSearchParams({ path });
    return this.get<FileContentDto>(`projects/${projectId}/files/content?${qs}`);
  }

  writeFile(projectId: string, input: WriteFileInput) {
    return this.put<WriteFileResult>(`projects/${projectId}/files/content`, input);
  }

  deleteFile(projectId: string, path: string) {
    const qs = new URLSearchParams({ path });
    return this.delete<void>(`projects/${projectId}/files?${qs}`);
  }

  // ─── Attachments ──────────────────────────────────────────────────────
  /**
   * Uploads a single attachment as multipart/form-data.
   * Caller passes a {Blob} (web) or {uri} (native) descriptor; the function
   * builds the FormData so screens stay platform-agnostic.
   */
  async uploadAttachment(projectId: string, file: MultipartFile): Promise<AttachmentDto> {
    // React Native and web FormData typings are not unified; cast to a permissive
    // signature so this code compiles for either platform.
    type AnyFormData = {
      append(name: string, value: unknown, fileName?: string): void;
    };
    const form = new FormData() as unknown as AnyFormData;
    if (typeof Blob !== 'undefined' && file.source instanceof Blob) {
      form.append('files', file.source, file.name);
    } else {
      form.append('files', {
        uri: (file.source as { uri: string }).uri,
        name: file.name,
        type: file.mimeType,
      });
    }
    const response = await this.fetcher(this.url(`projects/${projectId}/attachments`), {
      method: 'POST',
      body: form as unknown as RequestInit['body'],
    });
    const uploaded = await this.parse<AttachmentDto[]>(response);
    if (!uploaded[0]) {
      throw new PhoneBotApiError('No attachment was uploaded', response.status);
    }
    return uploaded[0];
  }

  // ─── Sessions / messages ──────────────────────────────────────────────
  listSessions(projectId: string) {
    return this.get<SessionDto[]>(`projects/${projectId}/sessions`);
  }

  createSession(projectId: string, title?: string) {
    return this.post<SessionDto>(`projects/${projectId}/sessions`, { title });
  }

  listMessages(sessionId: string) {
    return this.get<MessageDto[]>(`sessions/${sessionId}/messages`);
  }

  abortSession(sessionId: string) {
    return this.post<{ ok: true }>(`sessions/${sessionId}/abort`, {});
  }

  /** SSE endpoint URL — consumers open an EventSource themselves. */
  sessionStreamUrl(sessionId: string) {
    return this.url(`sessions/${sessionId}/messages`);
  }

  // ─── Skills ───────────────────────────────────────────────────────────
  listSkills() {
    return this.get<SkillDto[]>('skills');
  }

  createSkill(input: CreateSkillInput) {
    return this.post<SkillDto>('skills', input);
  }

  updateSkill(id: string, input: UpdateSkillInput) {
    return this.patch<SkillDto>(`skills/${id}`, input);
  }

  deleteSkill(id: string) {
    return this.delete<void>(`skills/${id}`);
  }

  // ─── MCP servers ──────────────────────────────────────────────────────
  listMcpServers() {
    return this.get<McpServerDto[]>('mcp-servers');
  }

  createMcpServer(input: CreateMcpServerInput) {
    return this.post<McpServerDto>('mcp-servers', input);
  }

  updateMcpServer(id: string, input: UpdateMcpServerInput) {
    return this.patch<McpServerDto>(`mcp-servers/${id}`, input);
  }

  deleteMcpServer(id: string) {
    return this.delete<void>(`mcp-servers/${id}`);
  }

  // ─── Runtime ──────────────────────────────────────────────────────────
  getRuntime(projectId: string) {
    return this.get<RuntimeDto>(`projects/${projectId}/runtime`);
  }

  runtimeUp(projectId: string, input?: RuntimeUpInput) {
    return this.post<RuntimeDto>(`projects/${projectId}/runtime/up`, input ?? {});
  }

  runtimeDown(projectId: string) {
    return this.post<RuntimeDto>(`projects/${projectId}/runtime/down`, {});
  }

  runtimeLogsUrl(projectId: string) {
    return this.url(`projects/${projectId}/runtime/logs`);
  }

  // ─── Git ──────────────────────────────────────────────────────────────
  gitStatus(projectId: string) {
    return this.get<GitStatusDto>(`projects/${projectId}/git/status`);
  }

  gitCommit(projectId: string, input: GitCommitInput) {
    return this.post<GitCommitResult>(`projects/${projectId}/git/commit`, input);
  }

  gitPush(projectId: string, input: GitPushInput) {
    return this.post<GitPushResult>(`projects/${projectId}/git/push`, input);
  }

  gitCommitAndPush(projectId: string, input: GitCommitAndPushInput) {
    return this.post<GitCommitAndPushResult>(`projects/${projectId}/git/commit-and-push`, input);
  }

  // ─── Internal helpers ─────────────────────────────────────────────────
  private async get<T>(path: string): Promise<T> {
    const response = await this.fetcher(this.url(path));
    return this.parse<T>(response);
  }

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await this.fetcher(this.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  private async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await this.fetcher(this.url(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  private async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await this.fetcher(this.url(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  private async delete<T = void>(path: string): Promise<T> {
    const response = await this.fetcher(this.url(path), { method: 'DELETE' });
    return this.parse<T>(response);
  }

  private async parse<T>(response: FetchResponseLike): Promise<T> {
    if (!response.ok) {
      const requestId = response.headers.get('x-request-id') ?? undefined;
      let code: string | undefined;
      let message = `dockerBot ${response.status} ${response.statusText ?? ''}`.trim();
      try {
        const body = (await response.json()) as { error?: { code?: string; message?: string } };
        if (body && body.error) {
          code = body.error.code;
          if (body.error.message) message = body.error.message;
        }
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch {
          /* ignore */
        }
      }
      throw new PhoneBotApiError(message, response.status, code, requestId);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${path}`;
  }
}
