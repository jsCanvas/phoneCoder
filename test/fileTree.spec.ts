import {
  flattenVisibleTree,
  getDeleteConfirmationCopy,
  getFileTreeRequestOptions,
  mergeFileTreeChildren,
  removeFileTreeNode,
  shouldLoadDirectoryChildren,
  toggleExpandedPath,
} from '../src/screens/fileTree';
import type { FileTreeNode } from '../src/types/api';

const tree: FileTreeNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'dir',
    children: [
      { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      {
        name: 'components',
        path: 'src/components',
        type: 'dir',
        children: [{ name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file' }],
      },
    ],
  },
  { name: 'README.md', path: 'README.md', type: 'file' },
];

describe('file tree helpers', () => {
  it('only includes children for expanded directories', () => {
    expect(flattenVisibleTree(tree, new Set()).map((node) => node.path)).toEqual([
      'src',
      'README.md',
    ]);

    expect(flattenVisibleTree(tree, new Set(['src'])).map((node) => node.path)).toEqual([
      'src',
      'src/App.tsx',
      'src/components',
      'README.md',
    ]);

    expect(
      flattenVisibleTree(tree, new Set(['src', 'src/components'])).map((node) => node.path),
    ).toEqual(['src', 'src/App.tsx', 'src/components', 'src/components/Button.tsx', 'README.md']);
  });

  it('toggles a directory path without mutating the previous set', () => {
    const expanded = new Set(['src']);
    const collapsed = toggleExpandedPath(expanded, 'src');
    const opened = toggleExpandedPath(expanded, 'src/components');

    expect([...expanded]).toEqual(['src']);
    expect([...collapsed]).toEqual([]);
    expect([...opened].sort()).toEqual(['src', 'src/components']);
  });

  it('requests the complete tree by default so deep folders can expand', () => {
    expect(getFileTreeRequestOptions()).toEqual({});
  });

  it('merges lazily loaded children into an existing directory node', () => {
    const partialTree: FileTreeNode[] = [
      {
        name: 'src',
        path: 'src',
        type: 'dir',
        children: [{ name: 'components', path: 'src/components', type: 'dir' }],
      },
    ];
    const merged = mergeFileTreeChildren(partialTree, 'src/components', [
      { name: 'Button.vue', path: 'src/components/Button.vue', type: 'file' },
    ]);

    expect(merged[0].children?.[0].children).toEqual([
      { name: 'Button.vue', path: 'src/components/Button.vue', type: 'file' },
    ]);
    expect(partialTree[0].children?.[0].children).toBeUndefined();
  });

  it('loads directory children when expanding a directory with an empty children array', () => {
    expect(
      shouldLoadDirectoryChildren({ name: 'components', path: 'src/components', type: 'dir' }, false),
    ).toBe(true);
    expect(
      shouldLoadDirectoryChildren(
        { name: 'components', path: 'src/components', type: 'dir', children: [] },
        false,
      ),
    ).toBe(true);
    expect(
      shouldLoadDirectoryChildren(
        {
          name: 'components',
          path: 'src/components',
          type: 'dir',
          children: [{ name: 'HeaderNav.vue', path: 'src/components/HeaderNav.vue', type: 'file' }],
        },
        false,
      ),
    ).toBe(false);
    expect(
      shouldLoadDirectoryChildren(
        { name: 'components', path: 'src/components', type: 'dir', children: [] },
        true,
      ),
    ).toBe(false);
  });

  it('removes a file or directory node from the tree without mutating the previous tree', () => {
    const nextTree = removeFileTreeNode(tree, 'src/components');

    expect(flattenVisibleTree(nextTree, new Set(['src'])).map((node) => node.path)).toEqual([
      'src',
      'src/App.tsx',
      'README.md',
    ]);
    expect(flattenVisibleTree(tree, new Set(['src'])).map((node) => node.path)).toContain(
      'src/components',
    );
  });

  it('builds delete confirmation copy for files and folders', () => {
    expect(getDeleteConfirmationCopy('src/App.tsx', 'file')).toEqual({
      title: 'Delete file?',
      message: 'This will permanently delete "src/App.tsx".',
      confirmLabel: 'Delete file',
    });
    expect(getDeleteConfirmationCopy('src/components', 'dir')).toEqual({
      title: 'Delete folder?',
      message: 'This will permanently delete "src/components" and every file under it.',
      confirmLabel: 'Delete folder',
    });
  });
});
