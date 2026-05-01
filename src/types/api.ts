/**
 * Type definitions mirroring the phoneBot HTTP API surface.
 * See: phoneBot/README.md and docs/plans/2026-04-28-phonebot-design.md
 */

// ─── Model configs ─────────────────────────────────────────────────────────
export type ModelConfigDto = {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  model: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateModelConfigInput = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  activate?: boolean;
};

export type UpdateModelConfigInput = Partial<CreateModelConfigInput>;

export type ModelConfigProbeResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

export type ProviderModelDto = {
  id: string;
  label: string;
  model: string;
  description: string;
  isLatest?: boolean;
};

export type ModelProviderDto = {
  id: string;
  label: string;
  name: string;
  baseUrl: string;
  description: string;
  models: ProviderModelDto[];
};

// ─── Projects ──────────────────────────────────────────────────────────────
export type ProjectStatus = 'created' | 'cloning' | 'ready' | 'error';

export type ProjectDto = {
  id: string;
  name: string;
  slug: string;
  gitUrl: string | null;
  hasGitToken: boolean;
  defaultBranch: string;
  workdir: string;
  status: ProjectStatus;
  lastError: string | null;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  name: string;
  slug?: string;
  gitUrl?: string;
  gitToken?: string;
  defaultBranch?: string;
};

// ─── Files ─────────────────────────────────────────────────────────────────
export type FileTreeNode = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  mtime?: string;
  children?: FileTreeNode[];
};

export type FileContentDto = {
  path: string;
  size: number;
  mime: string;
  sha: string;
  encoding: 'utf8' | 'base64';
  content: string;
};

export type WriteFileInput = {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
  expectedSha?: string;
};

export type WriteFileResult = {
  path: string;
  size: number;
  sha: string;
};

// ─── Attachments ───────────────────────────────────────────────────────────
export type AttachmentDto = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  relPath: string;
  createdAt: string;
};

// ─── Sessions / Messages ───────────────────────────────────────────────────
export type SessionDto = {
  id: string;
  project_id: string;
  title: string;
  claude_session_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type MessageDto = {
  id: string;
  role: MessageRole;
  content: unknown;
  runId: string | null;
  createdAt: string;
};

export type SendMessageInput = {
  text: string;
  attachmentIds?: string[];
  skills?: string[];
  mcpServers?: string[];
  abortPrevious?: boolean;
};

// ─── Skills ────────────────────────────────────────────────────────────────
export type SkillDto = {
  id: string;
  name: string;
  description: string;
  body: string;
  enabled: boolean;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSkillInput = {
  name: string;
  description: string;
  body: string;
};

export type UpdateSkillInput = {
  description?: string;
  body?: string;
  enabled?: boolean;
};

// ─── MCP servers ───────────────────────────────────────────────────────────
export type McpTransport = 'stdio' | 'http' | 'sse';

export type McpStdioConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type McpHttpConfig = {
  url: string;
  headers?: Record<string, string>;
};

export type McpConfig = McpStdioConfig | McpHttpConfig;

export type McpServerDto = {
  id: string;
  name: string;
  transport: McpTransport;
  enabled: boolean;
  config: McpConfig;
  createdAt: string;
  updatedAt: string;
};

export type CreateMcpServerInput = {
  name: string;
  transport: McpTransport;
  config: McpConfig;
};

export type UpdateMcpServerInput = {
  transport?: McpTransport;
  config?: McpConfig;
  enabled?: boolean;
};

// ─── Runtime ───────────────────────────────────────────────────────────────
export type RuntimeStatus = 'stopped' | 'starting' | 'running' | 'failed';

export type RuntimeDto = {
  id: string;
  project_id: string;
  status: RuntimeStatus;
  compose_file: string | null;
  preview_url: string | null;
  meta_json: string | null;
  started_at: string | null;
  stopped_at: string | null;
  updated_at: string;
};

export type RuntimeUpInput = {
  composePath?: string;
  port?: number;
};

// ─── Git ───────────────────────────────────────────────────────────────────
export type GitStatusDto = {
  modified: string[];
  staged: string[];
  untracked: string[];
  deleted: string[];
  conflicted: string[];
  branch: string | null;
  ahead: number;
  behind: number;
  clean: boolean;
};

export type GitCommitInput = {
  message: string;
  addAll?: boolean;
};

export type GitPushInput = {
  branch?: string;
  checkoutBranch?: boolean;
  force?: boolean;
};

export type GitCommitAndPushInput = GitCommitInput & GitPushInput;

export type GitCommitResult = {
  noop: boolean;
  commit?: string;
  files: number;
};

export type GitPushResult = {
  pushed: boolean;
  branch: string;
};

export type GitCommitAndPushResult = {
  commit: GitCommitResult;
  push: GitPushResult | { skipped: true };
};

// ─── Health ────────────────────────────────────────────────────────────────
export type HealthDto = {
  status: 'ok';
  profile: string;
  baseDomain: string;
  timestamp: string;
};
