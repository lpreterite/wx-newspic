import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanDirectory, isPathSafe } from '../../../src/preview/directory.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'preview-test-'));
}

function cleanupTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function createFile(dir: string, relativePath: string, content: string = ''): void {
  const fullPath = join(dir, relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

function createDir(dir: string, relativePath: string): void {
  mkdirSync(join(dir, relativePath), { recursive: true });
}

describe('scanDirectory', () => {
  it('TC-01: 过滤非 .md 文件，只保留 .md 和目录', () => {
    const dir = createTempDir();
    try {
      createFile(dir, 'intro.md', '# Hello');
      createFile(dir, 'guide.md', '# Guide');
      createFile(dir, 'logo.png', 'fake-png');
      createFile(dir, 'data.json', '{}');
      createDir(dir, 'assets');

      const result = scanDirectory(dir);

      const names = result.map((n) => n.name);
      expect(names).toEqual(expect.arrayContaining(['intro.md', 'guide.md', 'assets']));
      expect(names).not.toContain('logo.png');
      expect(names).not.toContain('data.json');
    } finally {
      cleanupTempDir(dir);
    }
  });

  it('TC-02: 递归扫描子目录，深度限制 2 层 + hasMore 标记', () => {
    const dir = createTempDir();
    try {
      createFile(dir, 'root.md');
      createDir(dir, 'l1/l2/l3');
      createFile(dir, 'l1/f1.md');
      createFile(dir, 'l1/l2/f2.md');
      createFile(dir, 'l1/l2/l3/f3.md');

      const result = scanDirectory(dir, 2);
      expect(result).toHaveLength(2);

      const l1 = result.find((n) => n.name === 'l1');
      expect(l1?.type).toBe('dir');
      expect(l1?.children).toHaveLength(2);
      expect(l1?.children?.[0].name).toBe('l2');
      expect(l1?.children?.[0].type).toBe('dir');
      expect(l1?.children?.[1].name).toBe('f1.md');

      const l2 = l1?.children?.[0];
      expect(l2?.hasMore).toBe(true);
      expect(l2?.children).toBeUndefined();

      const names = JSON.stringify(result);
      expect(names).not.toContain('f3.md');
    } finally {
      cleanupTempDir(dir);
    }
  });

  it('TC-03: 空目录返回空数组', () => {
    const dir = createTempDir();
    try {
      const result = scanDirectory(dir);
      expect(result).toHaveLength(0);
    } finally {
      cleanupTempDir(dir);
    }
  });

  it('TC-04: 隐藏文件和目录不显示', () => {
    const dir = createTempDir();
    try {
      createFile(dir, 'intro.md');
      createFile(dir, '.hidden.md');
      createDir(dir, '.config');
      createFile(dir, '.config/secret.md');
      createFile(dir, 'visible.md');

      const result = scanDirectory(dir);
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.name).sort()).toEqual(['intro.md', 'visible.md']);
    } finally {
      cleanupTempDir(dir);
    }
  });

  it('TC-05: 排序—目录在前，文件在后，各自按名称字母序', () => {
    const dir = createTempDir();
    try {
      createFile(dir, 'cow.md');
      createDir(dir, 'alpha');
      createFile(dir, 'alpha/inner.md');
      createDir(dir, 'beta');
      createFile(dir, 'beta/inner.md');

      const result = scanDirectory(dir);
      expect(result[0].name).toBe('alpha');
      expect(result[0].type).toBe('dir');
      expect(result[1].name).toBe('beta');
      expect(result[1].type).toBe('dir');
      expect(result[2].name).toBe('cow.md');
      expect(result[2].type).toBe('file');
    } finally {
      cleanupTempDir(dir);
    }
  });
});

describe('isPathSafe', () => {
  it('TC-06: 正确判断路径是否在允许范围内', () => {
    const allowed = ['/tmp/work'];

    expect(isPathSafe('/tmp/work', allowed)).toBe(true);
    expect(isPathSafe('/tmp/work/intro.md', allowed)).toBe(true);
    expect(isPathSafe('/tmp/work/sub/file.md', allowed)).toBe(true);
    expect(isPathSafe('/tmp/other/file.md', allowed)).toBe(false);
    expect(isPathSafe('/etc/passwd', allowed)).toBe(false);
    expect(isPathSafe('/tmp/work-other', allowed)).toBe(false);
  });
});