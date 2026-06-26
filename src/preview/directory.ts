import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: FileTreeNode[];
  hasMore?: boolean;
}

export function scanDirectory(dirPath: string, maxDepth: number = 2): FileTreeNode[] {
  const entries = readdirSync(dirPath);
  const nodes: FileTreeNode[] = [];

  for (const name of entries) {
    if (name.startsWith('.')) continue;

    const fullPath = join(dirPath, name);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const children = maxDepth > 1 ? scanDirectory(fullPath, maxDepth - 1) : [];
      const hasMore = readdirSync(fullPath).some(
        (child) => !child.startsWith('.') && statSync(join(fullPath, child)).isDirectory()
      );

      nodes.push({
        name,
        path: fullPath,
        type: 'dir',
        children: children.length > 0 ? children : undefined,
        hasMore: hasMore || undefined,
      });
    } else if (name.toLowerCase().endsWith('.md')) {
      nodes.push({
        name,
        path: fullPath,
        type: 'file',
      });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function isPathSafe(requestedPath: string, allowedDirs: string[]): boolean {
  const resolved = resolve(requestedPath);
  return allowedDirs.some((allowed) => {
    const base = resolve(allowed);
    return resolved === base || resolved.startsWith(base + '/');
  });
}

export function readFileContent(filePath: string): { content: string; name: string } {
  const content = readFileSync(filePath, 'utf-8');
  return { content, name: filePath.split('/').pop() ?? filePath };
}
