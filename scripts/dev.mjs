// Servidor local: arquivos estáticos + rotas de /api, imitando a Vercel.
// Uso: npm run dev   -> http://localhost:3000
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';

if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.ADMIN_PASSWORD) {
    process.env.ADMIN_PASSWORD = 'admin';
    console.warn('[dev] ADMIN_PASSWORD não definida: usando "admin".');
}
process.env.SESSION_SECRET ??= randomBytes(32).toString('hex');

if (!process.env.DATABASE_URL) {
    const { semear } = await import('./semear.js');
    await semear({ log: () => {} });
}

const RAIZ = process.cwd();
const PORTA = Number(process.env.PORT) || 3000;
const TIPOS = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json'
};
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));

async function api(req, res, caminho) {
    let modulo;
    try {
        modulo = await import(join(RAIZ, `${caminho}.js`));
    } catch {
        res.writeHead(404).end();
        return;
    }
    const handler = modulo[req.method];
    if (!handler) {
        res.writeHead(405).end();
        return;
    }
    const partes = [];
    for await (const parte of req) partes.push(parte);
    const request = new Request(`http://localhost:${PORTA}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(partes)
    });
    const resposta = await handler(request);
    res.writeHead(resposta.status, Object.fromEntries(resposta.headers));
    res.end(Buffer.from(await resposta.arrayBuffer()));
}

createServer(async (req, res) => {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const regra = vercel.rewrites?.find(r => r.source === caminho);
    if (regra) caminho = regra.destination;

    if (caminho.startsWith('/api/')) return api(req, res, caminho);

    if (caminho.endsWith('/')) caminho += 'index.html';
    const arquivo = normalize(join(RAIZ, caminho));
    try {
        if (!arquivo.startsWith(RAIZ) || !(await stat(arquivo)).isFile()) throw new Error();
        res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
        res.end(await readFile(arquivo));
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
    }
}).listen(PORTA, () => console.log(`Rodando em http://localhost:${PORTA}  (admin: /admin)`));
