// Conexão com o banco. Em produção usa o Neon (DATABASE_URL);
// em desenvolvimento local sem DATABASE_URL usa um Postgres em memória (PGlite).
import { readFile } from 'node:fs/promises';

let consulta;

async function criarConexao() {
    if (process.env.DATABASE_URL) {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        return (texto, params = []) => sql.query(texto, params);
    }

    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    console.warn('[db] DATABASE_URL não definida: usando banco local em memória (PGlite).');
    return async (texto, params = []) => (await db.query(texto, params)).rows;
}

export async function sql(texto, params) {
    consulta ??= criarConexao();
    return (await consulta)(texto, params);
}
