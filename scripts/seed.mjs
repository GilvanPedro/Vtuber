// Uso: DATABASE_URL=... npm run seed   (ou com DATABASE_URL no arquivo .env)
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');

if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL (string de conexão do Neon) no .env ou no ambiente.');
    process.exit(1);
}

const { semear } = await import('./semear.js');
await semear();
