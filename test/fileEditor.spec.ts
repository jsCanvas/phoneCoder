import {
  getEditorHeight,
  getMonacoLanguage,
  isMonacoCancellationError,
} from '../src/screens/fileEditor';

describe('file editor helpers', () => {
  it('maps common project file extensions to Monaco languages', () => {
    expect(getMonacoLanguage('src/App.vue', 'text/plain')).toBe('html');
    expect(getMonacoLanguage('src/main.js', 'application/javascript')).toBe('javascript');
    expect(getMonacoLanguage('src/App.tsx', 'text/plain')).toBe('typescript');
    expect(getMonacoLanguage('package.json', 'application/json')).toBe('json');
    expect(getMonacoLanguage('docker-compose.yml', 'text/yaml')).toBe('yaml');
    expect(getMonacoLanguage('README.md', 'text/markdown')).toBe('markdown');
    expect(getMonacoLanguage('styles.css', 'text/css')).toBe('css');
  });

  it('keeps the editor tall enough to fill most of the viewport', () => {
    expect(getEditorHeight(932)).toBe(640);
    expect(getEditorHeight(560)).toBe(360);
    expect(getEditorHeight(300)).toBe(320);
  });

  it('detects Monaco cancellation noise without hiding other errors', () => {
    const canceled = new Error('Canceled');
    canceled.name = 'Canceled';

    expect(isMonacoCancellationError(canceled)).toBe(true);
    expect(isMonacoCancellationError(new Error('Canceled'))).toBe(false);
    expect(isMonacoCancellationError(new Error('real failure'))).toBe(false);
  });
});
