// Cria as tabelas e importa as vtubers de db/seed.json (com as imagens de img/) para o banco.
import { readFile } from 'node:fs/promises';
import { sql } from '../lib/db.js';
import { validarVtuber } from '../lib/validar.js';
import { existe, criarVtuber } from '../lib/vtubers.js';

const raiz = new URL('../', import.meta.url);
const MIMES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

async function dataUrl(caminho) {
    const dados = await readFile(new URL(caminho, raiz));
    const mime = MIMES[caminho.split('.').pop().toLowerCase()];
    return `data:${mime};base64,${dados.toString('base64')}`;
}

export async function semear({ log = console.log } = {}) {
    const schema = await readFile(new URL('db/schema.sql', raiz), 'utf8');
    for (const comando of schema.split(/;\s*$/m).map(c => c.trim()).filter(Boolean)) {
        await sql(comando);
    }

    const seed = JSON.parse(await readFile(new URL('db/seed.json', raiz), 'utf8'));
    let criadas = 0;
    for (const [i, item] of seed.entries()) {
        if (await existe(item.id)) {
            log(`- ${item.id}: já existe, pulando`);
            continue;
        }
        const vt = validarVtuber({
            ...item,
            imagens: { card: await dataUrl(item.imagem_card), perfil: await dataUrl(item.imagem_perfil) }
        });
        // Mantém a ordem original: o primeiro do arquivo é o mais recente.
        await criarVtuber(vt, new Date(Date.now() - i * 60_000).toISOString());
        criadas++;
        log(`+ ${item.id}`);
    }
    log(`${criadas} vtuber(s) importada(s).`);
}
