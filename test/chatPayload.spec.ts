import { buildSendMessageInput } from '../src/chat/chatPayload';

describe('buildSendMessageInput', () => {
  it('extracts skills/mcp tokens and resolves attachment ids by image references', () => {
    expect(
      buildSendMessageInput({
        text: 'Build UI @wireframe.png /skill frontend-design /mcp figma @src/App.tsx @src/components/',
        attachments: [
          { id: 'img-1', name: 'wireframe.png' },
          { id: 'img-2', name: 'other' },
        ],
      }),
    ).toEqual({
      text: 'Build UI @wireframe.png /skill frontend-design /mcp figma @src/App.tsx @src/components/',
      attachmentIds: ['img-1'],
      skills: ['frontend-design'],
      mcpServers: ['figma'],
    });
  });

  it('includes all uploaded attachments when no @image tokens are present', () => {
    expect(
      buildSendMessageInput({
        text: 'Implement payments',
        attachments: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }],
      }),
    ).toEqual({
      text: 'Implement payments',
      attachmentIds: ['a', 'b'],
      skills: [],
      mcpServers: [],
    });
  });
});
