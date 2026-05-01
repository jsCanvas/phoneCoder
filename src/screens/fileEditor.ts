const EXTENSION_LANGUAGES: Record<string, string> = {
  css: 'css',
  html: 'html',
  js: 'javascript',
  json: 'json',
  jsx: 'javascript',
  md: 'markdown',
  mjs: 'javascript',
  sql: 'sql',
  ts: 'typescript',
  tsx: 'typescript',
  vue: 'html',
  yaml: 'yaml',
  yml: 'yaml',
};

export function getMonacoLanguage(path: string, mime: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension && EXTENSION_LANGUAGES[extension]) return EXTENSION_LANGUAGES[extension];
  if (mime === 'application/json') return 'json';
  if (mime === 'application/javascript') return 'javascript';
  if (mime.startsWith('text/')) return 'plaintext';
  return 'plaintext';
}

export function getEditorHeight(viewportHeight: number): number {
  const reservedHeight = viewportHeight >= 700 ? 292 : 200;
  return Math.max(320, Math.round(viewportHeight - reservedHeight));
}

export function isMonacoCancellationError(reason: unknown): boolean {
  return reason instanceof Error && reason.name === 'Canceled' && reason.message === 'Canceled';
}

export function installMonacoCancellationHandler(): void {
  const target = globalThis as typeof globalThis & {
    window?: Window & { __phoneClawMonacoCancellationHandlerInstalled?: boolean };
  };
  const win = target.window;
  if (!win || win.__phoneClawMonacoCancellationHandlerInstalled) return;
  win.__phoneClawMonacoCancellationHandlerInstalled = true;
  win.addEventListener('unhandledrejection', (event) => {
    if (isMonacoCancellationError(event.reason)) {
      event.preventDefault();
    }
  });
}
