// Aplica db/schema.sql no banco (cria tabelas/colunas que faltarem, sem apagar dados).
// Uso: npm run migrar   (usa DATABASE_URL do .env)
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');

if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL (string de conexão do Neon) no .env ou no ambiente.');
    process.exit(1);
}

const { aplicarSchema } = await import('./semear.js');
await aplicarSchema();
console.log('Banco atualizado.');
