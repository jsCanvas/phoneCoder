import { PhoneBotApiClient, PhoneBotApiError } from '../src/api/phoneBotApi';

type MockResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

function asResponse(body: MockResponse) {
  return {
    ok: body.ok,
    status: body.status,
    statusText: body.statusText,
    headers: { get: (name: string) => body.headers?.[name.toLowerCase()] ?? null },
    json: body.json ?? (() => Promise.resolve({})),
    text: body.text ?? (() => Promise.resolve('')),
  };
}

describe('PhoneBotApiClient', () => {
  it('creates an active model config via POST /model-configs', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      asResponse({
        ok: true,
        status: 201,
        json: async () => ({ id: 'mc-1', name: 'prod', isActive: true }),
      }),
    );
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    const result = await client.createModelConfig({
      name: 'prod',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-x',
      model: 'deepseek-chat',
      activate: true,
    });

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:8080/api/model-configs',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'prod',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-x',
      model: 'deepseek-chat',
      activate: true,
    });
    expect(result.id).toBe('mc-1');
  });

  it('fetches built-in model providers through GET /model-configs/providers', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      asResponse({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 'deepseek',
            label: 'DeepSeek',
            name: 'deepseek',
            baseUrl: 'https://api.deepseek.com/v1',
            description: 'DeepSeek models',
            models: [{ id: 'deepseek-v3.2', label: 'DeepSeek V3.2', model: 'deepseek-v3.2' }],
          },
        ],
      }),
    );
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    const providers = await client.listModelProviders();

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/api/model-configs/providers');
    expect(providers[0].models[0].model).toBe('deepseek-v3.2');
  });

  it('fetches projects, file tree and content with proper query strings', async () => {
    const rootTree = {
      name: '',
      path: '',
      type: 'dir',
      children: [{ name: 'index.ts', path: 'src/index.ts', type: 'file' }],
    };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(asResponse({ ok: true, status: 200, json: async () => [] }))
      .mockResolvedValueOnce(asResponse({ ok: true, status: 200, json: async () => rootTree }))
      .mockResolvedValueOnce(
        asResponse({
          ok: true,
          status: 200,
          json: async () => ({
            path: 'src/index.ts',
            size: 12,
            mime: 'text/plain',
            sha: 'abc',
            encoding: 'utf8',
            content: 'hello',
          }),
        }),
      );
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    await client.listProjects();
    const files = await client.listFiles('proj-1', { dir: 'src', depth: 2 });
    await client.readFile('proj-1', 'src/index.ts');

    expect(fetcher.mock.calls[0][0]).toBe('http://localhost:8080/api/projects');
    expect(fetcher.mock.calls[1][0]).toBe(
      'http://localhost:8080/api/projects/proj-1/files?path=src&depth=2',
    );
    expect(files).toEqual(rootTree.children);
    expect(fetcher.mock.calls[2][0]).toBe(
      'http://localhost:8080/api/projects/proj-1/files/content?path=src%2Findex.ts',
    );
  });

  it('writes file content via PUT and posts commit-and-push payloads', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        asResponse({
          ok: true,
          status: 200,
          json: async () => ({ path: 'a.txt', size: 5, sha: 'def' }),
        }),
      )
      .mockResolvedValueOnce(
        asResponse({
          ok: true,
          status: 200,
          json: async () => ({ commit: { noop: false, files: 2 }, push: { pushed: true, branch: 'main' } }),
        }),
      );
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    await client.writeFile('proj-1', { path: 'a.txt', content: 'hello', expectedSha: 'old' });
    await client.gitCommitAndPush('proj-1', { message: 'wip', addAll: true });

    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      path: 'a.txt',
      content: 'hello',
      expectedSha: 'old',
    });
    expect(fetcher.mock.calls[1][0]).toBe(
      'http://localhost:8080/api/projects/proj-1/git/commit-and-push',
    );
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ message: 'wip', addAll: true });
  });

  it('deletes files or folders through DELETE /files with a path query', async () => {
    const fetcher = jest.fn().mockResolvedValue(asResponse({ ok: true, status: 204 }));
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    await client.deleteFile('proj-1', 'src/components');

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:8080/api/projects/proj-1/files?path=src%2Fcomponents',
      { method: 'DELETE' },
    );
  });

  it('uploads attachments using the backend files field and unwraps the returned array', async () => {
    const globalWithFormData = globalThis as typeof globalThis & { FormData?: unknown };
    const OriginalFormData = globalWithFormData.FormData;
    const append = jest.fn();
    class MockFormData {
      append = append;
    }
    globalWithFormData.FormData = MockFormData;
    const fetcher = jest.fn().mockResolvedValue(
      asResponse({
        ok: true,
        status: 201,
        json: async () => [
          {
            id: 'att-1',
            filename: 'photo.png',
            mimeType: 'image/png',
            size: 10,
            relPath: '.phonebot/attachments/att-1-photo.png',
            createdAt: 'now',
          },
        ],
      }),
    );
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    try {
      const uploaded = await client.uploadAttachment('proj-1', {
        name: 'photo.png',
        mimeType: 'image/png',
        source: { uri: 'file://photo.png' },
      });

      expect(append).toHaveBeenCalledWith('files', {
        uri: 'file://photo.png',
        name: 'photo.png',
        type: 'image/png',
      });
      expect(fetcher).toHaveBeenCalledWith(
        'http://localhost:8080/api/projects/proj-1/attachments',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(uploaded.id).toBe('att-1');
    } finally {
      globalWithFormData.FormData = OriginalFormData;
    }
  });

  it('throws PhoneBotApiError with parsed code and request id on failure', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      asResponse({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: { 'x-request-id': 'req-9' },
        json: async () => ({ error: { code: 'file_conflict', message: 'sha mismatch' } }),
      }),
    );
    const client = new PhoneBotApiClient('http://localhost:8080/api', fetcher);

    await expect(client.listProjects()).rejects.toMatchObject({
      name: 'PhoneBotApiError',
      status: 409,
      code: 'file_conflict',
      message: 'sha mismatch',
      requestId: 'req-9',
    });
    expect(PhoneBotApiError).toBeDefined();
  });

  it('returns the SSE URL for a session', () => {
    const client = new PhoneBotApiClient('http://localhost:8080/api/');
    expect(client.sessionStreamUrl('s-1')).toBe('http://localhost:8080/api/sessions/s-1/messages');
  });
});
