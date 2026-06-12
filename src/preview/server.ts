import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { renderPreviewPage } from './template.js';
import { DEFAULT_MARKDOWN } from './default-content.js';

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

export interface PreviewServerOptions {
  port: number;
  onReady?: (port: number) => void;
}

export async function createPreviewServer(options: PreviewServerOptions): Promise<void> {
  const { port } = options;

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

  if (method === 'GET' && url === '/') {
    const html = renderPreviewPage(DEFAULT_MARKDOWN, BUILTIN_THEMES);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
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
