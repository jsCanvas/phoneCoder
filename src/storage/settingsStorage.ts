import AsyncStorage from '@react-native-async-storage/async-storage';

export type ClientSettings = {
  apiBaseUrl: string;
  /** Selected project for chat / files / preview / git tabs. */
  selectedProjectId?: string;
  /** Currently active multi-turn chat session. */
  selectedSessionId?: string;
  /** Active model config id (mirrors server `is_active`, but lets the UI
   *  remember the last user choice on a fresh load before /model-configs returns). */
  activeModelConfigId?: string;
  /** Skills the user previously enabled in the chat tab. */
  enabledSkillNames?: string[];
  /** MCP servers the user previously enabled in the chat tab. */
  enabledMcpNames?: string[];
};

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const SETTINGS_KEY = 'phonebot.client.settings';

export class SettingsStorage {
  constructor(private readonly storage: KeyValueStorage = AsyncStorage) {}

  async load(): Promise<ClientSettings | null> {
    const raw = await this.storage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as ClientSettings) : null;
  }

  /** Replace the entire settings record. */
  async save(settings: ClientSettings): Promise<void> {
    await this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  /** Merge a patch on top of any existing settings — all fields optional. */
  async patch(patch: Partial<ClientSettings>): Promise<ClientSettings> {
    const current = (await this.load()) ?? { apiBaseUrl: '' };
    const next: ClientSettings = { ...current, ...patch };
    await this.storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(SETTINGS_KEY);
  }
}
