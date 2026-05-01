import { DEFAULT_API_BASE_URL, DEFAULT_MODEL, DEFAULT_OPENAI_BASE_URL } from '../src/config/defaults';

describe('default client config', () => {
  it('points to the dockerBot API prefix served by the Nest app', () => {
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:8080/api');
  });

  it('exposes a sensible default OpenAI-compatible model + base URL', () => {
    expect(DEFAULT_OPENAI_BASE_URL.startsWith('https://')).toBe(true);
    expect(DEFAULT_MODEL).toBeTruthy();
  });
});
