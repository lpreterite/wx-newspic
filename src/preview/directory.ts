import { readdirSync, readFileSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';

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
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isSymbolicLink()) continue;

    if (stat.isDirectory()) {
      const children = maxDepth > 1 ? scanDirectory(fullPath, maxDepth - 1) : [];
      const hasMore = readdirSync(fullPath).some(
        (child) => !child.startsWith('.') && lstatSync(join(fullPath, child)).isDirectory()
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
  const realRequested = resolveRealPath(resolved);

  return allowedDirs.some((allowed) => {
    const resolvedAllowed = resolve(allowed);
    const realAllowed = resolveRealPath(resolvedAllowed);
    return realRequested === realAllowed || realRequested.startsWith(realAllowed + '/');
  });
}

function resolveRealPath(target: string): string {
  try {
    return realpathSync(target);
  } catch {
    const parts: string[] = [];
    let current = target;
    while (true) {
      const parent = dirname(current);
      if (parent === current) break;
      parts.unshift(basename(current));
      current = parent;
      try {
        const realParent = realpathSync(current);
        return join(realParent, ...parts);
      } catch {
        continue;
      }
    }
    return target;
  }
}

export function readFileContent(filePath: string): { content: string; name: string } {
  const content = readFileSync(filePath, 'utf-8');
  return { content, name: basename(filePath) };
}
