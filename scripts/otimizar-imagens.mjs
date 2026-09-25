// Converte as imagens já salvas no banco para WEBP nos tamanhos certos e gera as miniaturas do admin.
// Uso: npm run otimizar-imagens   (usa DATABASE_URL do .env). Pode rodar mais de uma vez.
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');

if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL (string de conexão do Neon) no .env ou no ambiente.');
    process.exit(1);
}

const { aplicarSchema } = await import('./semear.js');
const { sql } = await import('../lib/db.js');
const { reprocessarImagens } = await import('../lib/vtubers.js');

const tamanho = async () => (await sql('SELECT (sum(length(dados)) / 1024)::int AS kb FROM imagens'))[0].kb;

await aplicarSchema();
const antes = await tamanho();
const ids = (await sql('SELECT id FROM vtubers ORDER BY id')).map(l => l.id);
for (const id of ids) {
    console.log(`${id}: ${await reprocessarImagens(id)} imagem(ns) gerada(s)`);
}
console.log(`Imagens no banco: ${antes} KB -> ${await tamanho()} KB`);
