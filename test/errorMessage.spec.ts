import { getErrorMessage } from '../src/utils/errorMessage';

describe('getErrorMessage', () => {
  it('normalizes unknown errors for user-facing status text', () => {
    expect(getErrorMessage(new Error('Network failed'))).toBe('Network failed');
    expect(getErrorMessage('plain failure')).toBe('plain failure');
    expect(getErrorMessage(null)).toBe('Unexpected error');
  });
});
