export type MobileTabKey = 'settings' | 'project' | 'chat' | 'files' | 'preview' | 'git';

export type MobileTab = {
  key: MobileTabKey;
  label: string;
  title: string;
  description: string;
};

const tabs: MobileTab[] = [
  {
    key: 'settings',
    label: 'Model',
    title: 'Connection & Models',
    description: 'Configure dockerBot base URL and OpenAI-compatible model credentials.',
  },
  {
    key: 'project',
    label: 'Projects',
    title: 'Project workspace',
    description: 'Create or clone a Git project and pick the active workspace.',
  },
  {
    key: 'chat',
    label: 'Chat',
    title: 'Multi-turn agent chat',
    description: 'Stream agent runs, attach images, toggle skills and MCP servers.',
  },
  {
    key: 'files',
    label: 'Files',
    title: 'Project files',
    description: 'Browse the workspace tree and edit files in-place.',
  },
  {
    key: 'preview',
    label: 'Docker',
    title: 'Docker runtime',
    description: 'Bring the sandbox up and open the routed preview URL.',
  },
  {
    key: 'git',
    label: 'Git',
    title: 'Git submit',
    description: 'Inspect status and one-click commit-and-push to your remote.',
  },
];

export function getMobileTabs(): MobileTab[] {
  return tabs;
}
