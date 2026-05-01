/**
 * Default `phoneBot` API base URL used the first time the app is launched.
 * On a physical device, override this from the Settings tab to point at your
 * server's LAN address (e.g. `http://192.168.1.10:8080/api`).
 */
export const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';

/** Suggested default OpenAI-compatible base URL. */
export const DEFAULT_OPENAI_BASE_URL = 'https://api.deepseek.com/v1';

/** Suggested default model for the openai-compatible endpoint. */
export const DEFAULT_MODEL = 'deepseek-chat';
