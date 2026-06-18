import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readdirSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { renderPreviewPage } from './template.js';
import { DEFAULT_MARKDOWN } from './default-content.js';
import { renderArticle, registerThemeFromFile } from '../renderer/index.js';

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
  onReady?: (port: number) => void;
  themeFile?: string;
  hlTheme?: string;
}

export async function createPreviewServer(options: PreviewServerOptions): Promise<void> {
  const { port, themeFile, hlTheme } = options;

  if (themeFile) {
    const themeId = basename(themeFile, '.css');
    registerThemeFromFile(themeFile, themeId);
  }

  registerCustomThemes();

  const server = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await handleRequest(req, res);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      options.onReady?.(port);
      resolve();
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

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  if (method === 'POST' && url === '/render') {
    await handleRenderRequest(req, res);
    return;
  }

  if (method === 'GET' && url === '/') {
    const html = renderPreviewPage(DEFAULT_MARKDOWN);
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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(result.content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`渲染失败: ${String(err)}`);
  }
}
