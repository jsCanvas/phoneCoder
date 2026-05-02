import type { FileTreeNode } from '../types/api';

/**
 * Virtual file-tree row path for the project workspace root (not a real repo path).
 * When used as `runtimeDirectory` on Preview, means `runtimeUp` without `composePath`.
 */
export const WORKSPACE_ROOT_PATH = '\0workspace-root';

export type FileTreeRequestOptions = {
  dir?: string;
  depth?: number;
};

export type FlatFileTreeNode = FileTreeNode & {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

export function flattenVisibleTree(
  nodes: FileTreeNode[],
  expandedPaths: ReadonlySet<string>,
  depth = 0,
  acc: FlatFileTreeNode[] = [],
): FlatFileTreeNode[] {
  for (const node of nodes) {
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedPaths.has(node.path);
    acc.push({ ...node, depth, hasChildren, isExpanded });
    if (node.type === 'dir' && hasChildren && isExpanded) {
      flattenVisibleTree(node.children ?? [], expandedPaths, depth + 1, acc);
    }
  }
  return acc;
}

export function getFileTreeRequestOptions(): FileTreeRequestOptions {
  return {};
}

export function mergeFileTreeChildren(
  nodes: FileTreeNode[],
  targetPath: string,
  children: FileTreeNode[],
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (!node.children) return node;
    return {
      ...node,
      children: mergeFileTreeChildren(node.children, targetPath, children),
    };
  });
}

export function removeFileTreeNode(nodes: FileTreeNode[], targetPath: string): FileTreeNode[] {
  return nodes
    .filter((node) => node.path !== targetPath)
    .map((node) => {
      if (!node.children) return node;
      return {
        ...node,
        children: removeFileTreeNode(node.children, targetPath),
      };
    });
}

export function shouldLoadDirectoryChildren(node: FileTreeNode, wasExpanded: boolean): boolean {
  return node.type === 'dir' && !wasExpanded && (node.children?.length ?? 0) === 0;
}

export function getDeleteConfirmationCopy(path: string, type: FileTreeNode['type']) {
  if (type === 'dir') {
    return {
      title: 'Delete folder?',
      message: `This will permanently delete "${path}" and every file under it.`,
      confirmLabel: 'Delete folder',
    };
  }

  return {
    title: 'Delete file?',
    message: `This will permanently delete "${path}".`,
    confirmLabel: 'Delete file',
  };
}

export function toggleExpandedPath(
  expandedPaths: ReadonlySet<string>,
  path: string,
): Set<string> {
  const next = new Set(expandedPaths);
  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }
  return next;
}
