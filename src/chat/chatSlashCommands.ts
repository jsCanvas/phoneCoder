import type { McpServerDto, SkillDto } from '../types/api';

export type ActiveSlashCommand = {
  start: number;
  end: number;
  query: string;
};

export type SlashCommandSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: 'skill' | 'mcp';
  description: string;
};

export function getActiveSlashCommand(text: string, cursor: number): ActiveSlashCommand | null {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const beforeCursor = text.slice(0, safeCursor);
  const tokenStart = beforeCursor.search(/\S+$/);
  if (tokenStart < 0) return null;

  const token = beforeCursor.slice(tokenStart);
  if (!token.startsWith('/')) return null;

  return {
    start: tokenStart,
    end: safeCursor,
    query: token.slice(1),
  };
}

export function buildSlashCommandSuggestions(input: {
  query: string;
  skills: SkillDto[];
  mcpServers: McpServerDto[];
  limit?: number;
}): SlashCommandSuggestion[] {
  const query = input.query.toLowerCase();
  const suggestions = [
    ...input.skills.map<SlashCommandSuggestion>((skill) => ({
      id: `skill:${skill.name}`,
      label: skill.name,
      value: `/skill ${skill.name}`,
      kind: 'skill',
      description: skill.description,
    })),
    ...input.mcpServers.map<SlashCommandSuggestion>((mcp) => ({
      id: `mcp:${mcp.name}`,
      label: mcp.name,
      value: `/mcp ${mcp.name}`,
      kind: 'mcp',
      description: mcp.transport,
    })),
  ];

  return suggestions
    .filter((suggestion) =>
      [suggestion.label, suggestion.value, suggestion.kind, suggestion.description]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    .slice(0, input.limit ?? 8);
}

export function insertSlashCommand(input: {
  text: string;
  command: ActiveSlashCommand;
  value: string;
}): { text: string; cursor: number } {
  const replacement = `${input.value} `;
  const suffixStart =
    input.text[input.command.end] === ' ' ? input.command.end + 1 : input.command.end;
  const text =
    input.text.slice(0, input.command.start) + replacement + input.text.slice(suffixStart);
  return {
    text,
    cursor: input.command.start + replacement.length,
  };
}
