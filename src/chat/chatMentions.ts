import type { UploadedAttachment } from './chatPayload';
import type { FileTreeNode } from '../types/api';

export type ActiveMention = {
  start: number;
  end: number;
  query: string;
};

export type MentionSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: 'file' | 'directory' | 'image';
};

export type SlashSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: 'skill';
  description: string;
  isBuiltin: boolean;
};

export function getActiveMention(text: string, cursor: number): ActiveMention | null {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const beforeCursor = text.slice(0, safeCursor);
  const tokenStart = beforeCursor.search(/\S+$/);
  if (tokenStart < 0) return null;

  const token = beforeCursor.slice(tokenStart);
  if (!token.startsWith('@')) return null;

  return {
    start: tokenStart,
    end: safeCursor,
    query: token.slice(1),
  };
}

export function getActiveSlashCommand(text: string, cursor: number): ActiveMention | null {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const beforeCursor = text.slice(0, safeCursor);
  const tokenStart = beforeCursor.search(/\S+$/);
  if (tokenStart < 0) return null;

  const token = beforeCursor.slice(tokenStart);
  if (!token.startsWith('/') || token.includes(' ')) return null;

  return {
    start: tokenStart,
    end: safeCursor,
    query: token.slice(1),
  };
}

export function buildMentionSuggestions(input: {
  query: string;
  files: FileTreeNode[];
  attachments: UploadedAttachment[];
  limit?: number;
}): MentionSuggestion[] {
  const query = input.query.toLowerCase();
  const suggestions = [
    ...flattenFileSuggestions(input.files),
    ...input.attachments.map<MentionSuggestion>((attachment) => ({
      id: `image:${attachment.name}`,
      label: attachment.name,
      value: attachment.name,
      kind: 'image',
    })),
  ];

  return suggestions
    .filter((suggestion) => suggestion.value.toLowerCase().includes(query))
    .slice(0, input.limit ?? 8);
}

export function insertMention(input: {
  text: string;
  mention: ActiveMention;
  value: string;
}): { text: string; cursor: number } {
  const replacement = `@${input.value} `;
  const suffixStart =
    input.text[input.mention.end] === ' ' ? input.mention.end + 1 : input.mention.end;
  const text = input.text.slice(0, input.mention.start) + replacement + input.text.slice(suffixStart);
  return {
    text,
    cursor: input.mention.start + replacement.length,
  };
}

export function buildSlashSuggestions(input: {
  query: string;
  skills: Array<{ name: string; description: string; isBuiltin: boolean }>;
  limit?: number;
}): SlashSuggestion[] {
  const query = input.query.toLowerCase();
  return input.skills
    .map<SlashSuggestion>((skill) => ({
      id: `skill:${skill.name}`,
      label: skill.name,
      value: skill.name,
      kind: 'skill',
      description: skill.description,
      isBuiltin: skill.isBuiltin,
    }))
    .filter((suggestion) => suggestion.value.toLowerCase().includes(query))
    .slice(0, input.limit ?? 8);
}

export function insertSlashSuggestion(input: {
  text: string;
  command: ActiveMention;
  value: string;
}): { text: string; cursor: number } {
  const replacement = `/skill ${input.value} `;
  const suffixStart =
    input.text[input.command.end] === ' ' ? input.command.end + 1 : input.command.end;
  const text = input.text.slice(0, input.command.start) + replacement + input.text.slice(suffixStart);
  return {
    text,
    cursor: input.command.start + replacement.length,
  };
}

function flattenFileSuggestions(nodes: FileTreeNode[]): MentionSuggestion[] {
  return nodes.flatMap((node) => {
    const suggestion: MentionSuggestion = {
      id: `${node.type === 'dir' ? 'dir' : 'file'}:${node.path}`,
      label: node.name,
      value: node.type === 'dir' ? `${node.path}/` : node.path,
      kind: node.type === 'dir' ? 'directory' : 'file',
    };
    return [suggestion, ...flattenFileSuggestions(node.children ?? [])];
  });
}
