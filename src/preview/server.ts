import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type http from 'node:http';
import { readdirSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { URL } from 'node:url';
import { renderPreviewPage } from './template.js';
import { DEFAULT_MARKDOWN } from './default-content.js';
import { renderArticle, registerThemeFromFile } from '../renderer/index.js';
import { scanDirectory, isPathSafe, readFileContent } from './directory.js';

const THEMES_DIR = resolve(homedir(), '.wx-newspic', 'themes');
const HL_THEMES = [
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: '', name: '默认' },
  { id: 'atom-one-dark', name: 'Atom One Dark' },
  { id: 'atom-one-light', name: 'Atom One Light' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'github', name: 'GitHub' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'solarized-light', name: 'Solarized Light' },
  { id: 'xcode', name: 'Xcode' },
];

const BUILTIN_THEMES = [
  { id: 'default', name: 'Default' },
  { id: 'orangeheart', name: 'Orange Heart' },
  { id: 'rainbow', name: 'Rainbow' },
  { id: 'lapis', name: 'Lapis' },
  { id: 'pie', name: 'Pie' },
  { id: 'maize', name: 'Maize' },
  { id: 'purple', name: 'Purple' },
  { id: 'phycat', name: 'Phycat' },
  { id: 'nord', name: 'Nord' },
];

function listCustomThemes(): { id: string; name: string }[] {
  if (!existsSync(THEMES_DIR)) return [];
  const files = readdirSync(THEMES_DIR);
  return files
    .filter((f) => f.endsWith('.css'))
    .map((f) => {
      const id = basename(f, '.css');
      return { id, name: id };
    });
}

function registerCustomThemes(): void {
  if (!existsSync(THEMES_DIR)) return;
  const files = readdirSync(THEMES_DIR);
  for (const f of files) {
    if (!f.endsWith('.css')) continue;
    const id = basename(f, '.css');
    const filePath = resolve(THEMES_DIR, f);
    registerThemeFromFile(filePath, id);
  }
}

export interface PreviewServerOptions {
  port: number;
  host?: string;
  onReady?: (port: number) => void;
  themeFile?: string;
  hlTheme?: string;
  watchDirs?: string[];
}

export async function createPreviewServer(options: PreviewServerOptions): Promise<http.Server> {
  const { port, host, themeFile, hlTheme, watchDirs } = options;

  if (themeFile) {
    const themeId = basename(themeFile, '.css');
    registerThemeFromFile(themeFile, themeId);
  }

  registerCustomThemes();

  const server = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await handleRequest(req, res, watchDirs);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const actualPort = addr && typeof addr === 'object' ? addr.port : port;
      options.onReady?.(actualPort);
      resolve(server);
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`错误：端口 ${port} 已被占用`);
        process.exit(1);
      }
      reject(err);
    });
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, watchDirs?: string[]): Promise<void> {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  if (method === 'POST' && url === '/render') {
    await handleRenderRequest(req, res);
    return;
  }

  if (method === 'GET' && url === '/') {
    const html = renderPreviewPage(DEFAULT_MARKDOWN, watchDirs ?? [process.cwd()]);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (method === 'GET' && url === '/themes') {
    const data = JSON.stringify({ builtin: BUILTIN_THEMES, custom: listCustomThemes() });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(data);
    return;
  }

  if (method === 'GET' && url === '/hl-themes') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(HL_THEMES));
    return;
  }

  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (method === 'GET' && url.startsWith('/files')) {
    const parsed = new URL(url, 'http://localhost');
    const dir = parsed.searchParams.get('dir');
    if (!dir) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '缺少 dir 参数' }));
      return;
    }
    const resolvedDir = resolve(dir);
    if (!isPathSafe(resolvedDir, watchDirs ?? [])) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '路径不在允许范围内' }));
      return;
    }
    if (!existsSync(resolvedDir)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '目录不存在' }));
      return;
    }
    const tree = scanDirectory(resolvedDir, 2);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(tree));
    return;
  }

  if (method === 'GET' && url.startsWith('/file')) {
    const parsed = new URL(url, 'http://localhost');
    const filePath = parsed.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '缺少 path 参数' }));
      return;
    }
    const resolvedPath = resolve(filePath);
    if (!isPathSafe(resolvedPath, watchDirs ?? [])) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '路径不在允许范围内' }));
      return;
    }
    if (!existsSync(resolvedPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '文件不存在' }));
      return;
    }
    try {
      const result = readFileContent(resolvedPath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '文件读取失败' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
}

function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function handleRenderRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: string;
  try {
    body = await collectBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('读取请求体失败');
    return;
  }

  let params: { content?: string; theme?: string; hlTheme?: string };
  try {
    params = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('JSON 解析失败');
    return;
  }

  if (!params.content || typeof params.content !== 'string') {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('缺少 content 字段');
    return;
  }

  try {
    const result = await renderArticle({
      content: params.content,
      theme: params.theme ?? 'default',
      hlTheme: params.hlTheme || undefined,
    });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`渲染失败: ${String(err)}`);
  }
}
