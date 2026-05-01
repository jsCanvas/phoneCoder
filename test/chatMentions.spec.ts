import {
  buildSlashSuggestions,
  buildMentionSuggestions,
  getActiveMention,
  getActiveSlashCommand,
  insertMention,
  insertSlashSuggestion,
} from '../src/chat/chatMentions';
import type { FileTreeNode } from '../src/types/api';

const fileTree: FileTreeNode[] = [
  { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
  {
    name: 'components',
    path: 'src/components',
    type: 'dir',
    children: [{ name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file' }],
  },
];

describe('chat mentions', () => {
  it('detects the active @ token at the cursor', () => {
    expect(getActiveMention('Build @src/ now', 11)).toEqual({
      start: 6,
      end: 11,
      query: 'src/',
    });
    expect(getActiveMention('Build @src/ now', 4)).toBeNull();
  });

  it('builds matching file, directory and image suggestions', () => {
    expect(
      buildMentionSuggestions({
        query: 'src',
        files: fileTree,
        attachments: [{ id: 'img-1', name: 'src-shot.png' }],
      }),
    ).toEqual([
      { id: 'file:src/App.tsx', label: 'App.tsx', value: 'src/App.tsx', kind: 'file' },
      { id: 'dir:src/components', label: 'components', value: 'src/components/', kind: 'directory' },
      {
        id: 'file:src/components/Button.tsx',
        label: 'Button.tsx',
        value: 'src/components/Button.tsx',
        kind: 'file',
      },
      { id: 'image:src-shot.png', label: 'src-shot.png', value: 'src-shot.png', kind: 'image' },
    ]);
  });

  it('replaces the active @ token with the selected suggestion', () => {
    expect(
      insertMention({
        text: 'Build @src now',
        mention: { start: 6, end: 10, query: 'src' },
        value: 'src/components/',
      }),
    ).toEqual({
      text: 'Build @src/components/ now',
      cursor: 23,
    });
  });

  it('detects / tokens and suggests matching skills', () => {
    expect(getActiveSlashCommand('Use /front now', 10)).toEqual({
      start: 4,
      end: 10,
      query: 'front',
    });
    expect(
      buildSlashSuggestions({
        query: 'front',
        skills: [
          { name: 'frontend-design', description: 'Design UI', isBuiltin: true },
          { name: 'backend-api', description: 'Build APIs', isBuiltin: false },
        ],
      }),
    ).toEqual([
      {
        id: 'skill:frontend-design',
        label: 'frontend-design',
        value: 'frontend-design',
        kind: 'skill',
        description: 'Design UI',
        isBuiltin: true,
      },
    ]);
  });

  it('inserts selected slash skill suggestions as /skill tokens', () => {
    expect(
      insertSlashSuggestion({
        text: 'Use /front now',
        command: { start: 4, end: 10, query: 'front' },
        value: 'frontend-design',
      }),
    ).toEqual({
      text: 'Use /skill frontend-design now',
      cursor: 27,
    });
  });
});
