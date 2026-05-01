import type { PhoneBotApiClient } from '../src/api/phoneBotApi';
import {
  activateModelConfig,
  commitAndPushProject,
  createModelConfigFromForm,
  createProjectFromForm,
  ensureChatSession,
  saveApiBaseUrl,
  saveFileContent,
  selectProject,
  selectSession,
  startRuntimeAndOpen,
} from '../src/screens/screenActions';
import type { SettingsStorage } from '../src/storage/settingsStorage';

function mockStorage() {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(null),
    patch: jest.fn().mockResolvedValue({}),
    clear: jest.fn().mockResolvedValue(undefined),
  } as unknown as SettingsStorage;
}

describe('screenActions', () => {
  it('saveApiBaseUrl patches storage', async () => {
    const storage = mockStorage();
    await saveApiBaseUrl({ storage, apiBaseUrl: 'http://lan:8080/api' });
    expect((storage as unknown as { patch: jest.Mock }).patch).toHaveBeenCalledWith({
      apiBaseUrl: 'http://lan:8080/api',
    });
  });

  it('createModelConfigFromForm creates with activate=true and persists active id when active', async () => {
    const apiClient = {
      createModelConfig: jest
        .fn()
        .mockResolvedValue({ id: 'mc-1', isActive: true, name: 'prod' }),
    };
    const storage = mockStorage();

    await createModelConfigFromForm({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      storage,
      form: { name: 'prod', baseUrl: 'b', apiKey: 'k', model: 'm' },
    });

    expect(apiClient.createModelConfig).toHaveBeenCalledWith(
      expect.objectContaining({ activate: true }),
    );
    expect((storage as unknown as { patch: jest.Mock }).patch).toHaveBeenCalledWith({
      activeModelConfigId: 'mc-1',
    });
  });

  it('activateModelConfig calls API and patches storage', async () => {
    const apiClient = {
      activateModelConfig: jest.fn().mockResolvedValue({ id: 'mc-2', name: 'x' }),
    };
    const storage = mockStorage();
    const result = await activateModelConfig({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      storage,
      id: 'mc-2',
    });
    expect(result.id).toBe('mc-2');
    expect((storage as unknown as { patch: jest.Mock }).patch).toHaveBeenCalledWith({
      activeModelConfigId: 'mc-2',
    });
  });

  it('createProjectFromForm calls API and stores selected project id', async () => {
    const apiClient = {
      createProject: jest.fn().mockResolvedValue({ id: 'p-1' }),
    };
    const storage = mockStorage();
    await createProjectFromForm({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      storage,
      form: {
        name: 'demo',
        gitUrl: 'https://github.com/acme/demo.git',
        gitToken: 't',
      },
    });
    expect(apiClient.createProject).toHaveBeenCalledWith({
      name: 'demo',
      gitUrl: 'https://github.com/acme/demo.git',
      gitToken: 't',
    });
    expect((storage as unknown as { patch: jest.Mock }).patch).toHaveBeenCalledWith({
      selectedProjectId: 'p-1',
    });
  });

  it('selectProject and selectSession patch storage', async () => {
    const storage = mockStorage();
    await selectProject({ storage, projectId: 'p' });
    await selectSession({ storage, sessionId: 's' });
    const patch = (storage as unknown as { patch: jest.Mock }).patch;
    expect(patch.mock.calls[0][0]).toEqual({
      selectedProjectId: 'p',
      selectedSessionId: undefined,
    });
    expect(patch.mock.calls[1][0]).toEqual({ selectedSessionId: 's' });
  });

  it('ensureChatSession reuses an existing session when preferred id is valid', async () => {
    const apiClient = {
      listSessions: jest.fn().mockResolvedValue([{ id: 's-1', title: 'old' }]),
      createSession: jest.fn(),
    };
    const storage = mockStorage();
    const result = await ensureChatSession({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      storage,
      projectId: 'p',
      preferredSessionId: 's-1',
    });
    expect(result.id).toBe('s-1');
    expect(apiClient.createSession).not.toHaveBeenCalled();
  });

  it('ensureChatSession creates a new one when no preferred id matches', async () => {
    const apiClient = {
      listSessions: jest.fn().mockResolvedValue([]),
      createSession: jest.fn().mockResolvedValue({ id: 's-2', title: 'new' }),
    };
    const storage = mockStorage();
    const result = await ensureChatSession({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      storage,
      projectId: 'p',
      title: 't',
    });
    expect(result.id).toBe('s-2');
    expect(apiClient.createSession).toHaveBeenCalledWith('p', 't');
    expect((storage as unknown as { patch: jest.Mock }).patch).toHaveBeenCalledWith({
      selectedSessionId: 's-2',
    });
  });

  it('saveFileContent forwards expectedSha for OCC', async () => {
    const apiClient = { writeFile: jest.fn().mockResolvedValue({ path: 'a', size: 1, sha: 'new' }) };
    await saveFileContent({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      projectId: 'p',
      form: { path: 'a', content: 'x', expectedSha: 'old' },
    });
    expect(apiClient.writeFile).toHaveBeenCalledWith('p', {
      path: 'a',
      content: 'x',
      expectedSha: 'old',
    });
  });

  it('startRuntimeAndOpen opens the preview URL when present', async () => {
    const apiClient = {
      runtimeUp: jest.fn().mockResolvedValue({ preview_url: 'https://demo.localhost' }),
    };
    const open = jest.fn();
    await startRuntimeAndOpen({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      projectId: 'p',
      openUrl: open,
    });
    expect(open).toHaveBeenCalledWith('https://demo.localhost');
  });

  it('startRuntimeAndOpen forwards the selected directory as composePath', async () => {
    const apiClient = {
      runtimeUp: jest.fn().mockResolvedValue({ preview_url: null }),
    };
    await startRuntimeAndOpen({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      projectId: 'p',
      composePath: 'frontend',
      openUrl: jest.fn(),
    });

    expect(apiClient.runtimeUp).toHaveBeenCalledWith('p', { composePath: 'frontend' });
  });

  it('startRuntimeAndOpen skips opening when no preview URL is returned', async () => {
    const apiClient = {
      runtimeUp: jest.fn().mockResolvedValue({ preview_url: null }),
    };
    const open = jest.fn();
    await startRuntimeAndOpen({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      projectId: 'p',
      openUrl: open,
    });
    expect(open).not.toHaveBeenCalled();
  });

  it('commitAndPushProject sends addAll=true and optional branch', async () => {
    const apiClient = {
      gitCommitAndPush: jest.fn().mockResolvedValue({}),
    };
    await commitAndPushProject({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      projectId: 'p',
      message: 'wip',
      branch: 'main',
    });
    expect(apiClient.gitCommitAndPush).toHaveBeenCalledWith('p', {
      message: 'wip',
      addAll: true,
      branch: 'main',
    });
  });

  it('commitAndPushProject can checkout a new branch before committing', async () => {
    const apiClient = {
      gitCommitAndPush: jest.fn().mockResolvedValue({}),
    };
    await commitAndPushProject({
      apiClient: apiClient as unknown as PhoneBotApiClient,
      projectId: 'p',
      message: 'wip',
      branch: 'feature/demo',
      checkoutBranch: true,
    });
    expect(apiClient.gitCommitAndPush).toHaveBeenCalledWith('p', {
      message: 'wip',
      addAll: true,
      branch: 'feature/demo',
      checkoutBranch: true,
    });
  });
});
