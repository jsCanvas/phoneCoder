import { SettingsStorage } from '../src/storage/settingsStorage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
}

describe('SettingsStorage', () => {
  it('saves and loads the full settings record', async () => {
    const storage = new SettingsStorage(memoryStorage());
    await storage.save({
      apiBaseUrl: 'http://localhost:8080/api',
      selectedProjectId: 'p-1',
      selectedSessionId: 's-1',
      activeModelConfigId: 'mc-1',
    });
    expect(await storage.load()).toEqual({
      apiBaseUrl: 'http://localhost:8080/api',
      selectedProjectId: 'p-1',
      selectedSessionId: 's-1',
      activeModelConfigId: 'mc-1',
    });
  });

  it('patch merges into existing settings', async () => {
    const storage = new SettingsStorage(memoryStorage());
    await storage.save({ apiBaseUrl: 'http://lan:8080/api', selectedProjectId: 'p' });
    const next = await storage.patch({ selectedSessionId: 's' });
    expect(next).toEqual({
      apiBaseUrl: 'http://lan:8080/api',
      selectedProjectId: 'p',
      selectedSessionId: 's',
    });
  });

  it('clear removes the persisted record', async () => {
    const storage = new SettingsStorage(memoryStorage());
    await storage.save({ apiBaseUrl: 'http://x' });
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });
});
