// Conexão com o banco. Em produção usa o Neon (DATABASE_URL);
// em desenvolvimento local sem DATABASE_URL usa um Postgres em memória (PGlite).
import { readFile } from 'node:fs/promises';

let conexao;

// Pega erros comuns ao colar a variável (aspas, "DATABASE_URL=", URL repetida, quebras de linha).
function validarUrl(bruta) {
    const url = bruta.trim();
    const problema =
        /^DATABASE_URL\s*=/i.test(url) ? 'o valor começa com "DATABASE_URL=" (cole só a URL)' :
        /^["'`]|["'`]$/.test(url) ? 'o valor está entre aspas (remova as aspas)' :
        (url.match(/postgres(ql)?:\/\//gi) || []).length > 1 ? 'o valor tem mais de uma URL (cole só uma vez)' :
        /\s/.test(url) ? 'o valor tem espaços ou quebras de linha' :
        !/^postgres(ql)?:\/\//i.test(url) ? 'o valor precisa começar com postgresql://' :
        null;
    if (problema) throw new Error(`DATABASE_URL inválida: ${problema}. Corrija em Settings > Environment Variables e faça um Redeploy.`);
    return url;
}

async function criarConexao() {
    if (process.env.DATABASE_URL) {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(validarUrl(process.env.DATABASE_URL));
        return {
            consulta: (texto, params = []) => sql.query(texto, params),
            // Todas as consultas vão numa única requisição HTTP ao Neon.
            transacao: consultas => sql.transaction(consultas.map(([texto, params]) => sql.query(texto, params)))
        };
    }

    if (process.env.VERCEL) {
        throw new Error('DATABASE_URL não configurada: cadastre-a em Settings > Environment Variables e faça um Redeploy.');
    }

    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    console.warn('[db] DATABASE_URL não definida: usando banco local em memória (PGlite).');
    return {
        consulta: async (texto, params = []) => (await db.query(texto, params)).rows,
        transacao: consultas => db.transaction(async tx => {
            const resultados = [];
            for (const [texto, params] of consultas) resultados.push((await tx.query(texto, params)).rows);
            return resultados;
        })
    };
}

// Se a conexão falhar, não guarda o erro: a próxima requisição tenta de novo.
const obter = () => (conexao ??= criarConexao().catch(e => {
    conexao = undefined;
    throw e;
}));

export async function sql(texto, params) {
    return (await obter()).consulta(texto, params);
}

// Executa [[texto, params], ...] numa transação e devolve as linhas de cada consulta.
export async function transacao(consultas) {
    return (await obter()).transacao(consultas);
}
