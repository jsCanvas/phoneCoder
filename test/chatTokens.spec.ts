import { parseChatTokens } from '../src/chat/chatTokens';

describe('parseChatTokens', () => {
  it('extracts skill, mcp, file, directory and image references from chat text', () => {
    expect(
      parseChatTokens('Build UI /skill frontend-design /mcp figma @src/App.tsx @src/components/ @wireframe'),
    ).toEqual({
      content: 'Build UI',
      skills: ['frontend-design'],
      mcpServers: ['figma'],
      fileRefs: ['src/App.tsx'],
      directoryRefs: ['src/components'],
      imageRefs: ['wireframe'],
    });
  });
});
