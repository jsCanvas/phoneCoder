import type { SendMessageInput } from '../types/api';
import { parseChatTokens } from './chatTokens';

export type UploadedAttachment = {
  id: string;
  name: string;
};

/**
 * Turns a free-form chat input + attachment list into a dockerBot
 * `SendMessageInput`. The text is forwarded as-is — dockerBot's agent does its
 * own `@image`/`@file` token resolution server-side, but we still pull out
 * skill/MCP hints so we can attach them as enabled context for the run.
 */
export function buildSendMessageInput(input: {
  text: string;
  attachments: UploadedAttachment[];
}): SendMessageInput {
  const parsed = parseChatTokens(input.text);
  const imageRefSet = new Set([
    ...parsed.imageRefs,
    ...extractAttachmentMentions(input.text, input.attachments),
  ]);
  const attachmentIds =
    imageRefSet.size === 0
      ? input.attachments.map((a) => a.id)
      : input.attachments.filter((a) => imageRefSet.has(a.name)).map((a) => a.id);

  return {
    text: input.text,
    attachmentIds,
    skills: parsed.skills,
    mcpServers: parsed.mcpServers,
  };
}

function extractAttachmentMentions(text: string, attachments: UploadedAttachment[]): string[] {
  const names = new Set(attachments.map((attachment) => attachment.name));
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => token.startsWith('@') && names.has(token.slice(1)))
    .map((token) => token.slice(1));
}
