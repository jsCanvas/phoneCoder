export type ParsedChatTokens = {
  content: string;
  skills: string[];
  mcpServers: string[];
  fileRefs: string[];
  directoryRefs: string[];
  imageRefs: string[];
};

export function parseChatTokens(text: string): ParsedChatTokens {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const content: string[] = [];
  const parsed: ParsedChatTokens = {
    content: '',
    skills: [],
    mcpServers: [],
    fileRefs: [],
    directoryRefs: [],
    imageRefs: [],
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '/skill' && tokens[index + 1]) {
      parsed.skills.push(tokens[index + 1]);
      index += 1;
    } else if (token === '/mcp' && tokens[index + 1]) {
      parsed.mcpServers.push(tokens[index + 1]);
      index += 1;
    } else if (token.startsWith('@')) {
      const ref = token.slice(1);
      const path = ref.replace(/\/$/, '');
      if (token.endsWith('/')) {
        parsed.directoryRefs.push(path);
      } else if (looksLikeFilePath(ref)) {
        parsed.fileRefs.push(path);
      } else {
        parsed.imageRefs.push(ref);
      }
    } else {
      content.push(token);
    }
  }

  return { ...parsed, content: content.join(' ') };
}

function looksLikeFilePath(ref: string): boolean {
  return ref.includes('/') || /\.[A-Za-z0-9]{1,12}$/.test(ref);
}
