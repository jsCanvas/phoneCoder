import {
  buildSlashCommandSuggestions,
  getActiveSlashCommand,
  insertSlashCommand,
} from '../src/chat/chatSlashCommands';
import type { McpServerDto, SkillDto } from '../src/types/api';

const skills: SkillDto[] = [
  {
    id: 'skill-1',
    name: 'frontend-design',
    description: 'Design frontend UI',
    body: '',
    enabled: true,
    isBuiltin: true,
    createdAt: '',
    updatedAt: '',
  },
];

const mcpServers: McpServerDto[] = [
  {
    id: 'mcp-1',
    name: 'figma',
    transport: 'http',
    enabled: true,
    config: { url: 'https://mcp.example.com' },
    createdAt: '',
    updatedAt: '',
  },
];

describe('chat slash commands', () => {
  it('detects the active / token at the cursor', () => {
    expect(getActiveSlashCommand('Use /fro now', 8)).toEqual({
      start: 4,
      end: 8,
      query: 'fro',
    });
    expect(getActiveSlashCommand('Use /fro now', 2)).toBeNull();
  });

  it('builds matching skill and mcp suggestions', () => {
    expect(
      buildSlashCommandSuggestions({
        query: 'f',
        skills,
        mcpServers,
      }),
    ).toEqual([
      {
        id: 'skill:frontend-design',
        label: 'frontend-design',
        value: '/skill frontend-design',
        kind: 'skill',
        description: 'Design frontend UI',
      },
      {
        id: 'mcp:figma',
        label: 'figma',
        value: '/mcp figma',
        kind: 'mcp',
        description: 'http',
      },
    ]);
  });

  it('replaces the active / token with the selected command', () => {
    expect(
      insertSlashCommand({
        text: 'Use /fro now',
        command: { start: 4, end: 8, query: 'fro' },
        value: '/skill frontend-design',
      }),
    ).toEqual({
      text: 'Use /skill frontend-design now',
      cursor: 27,
    });
  });
});
