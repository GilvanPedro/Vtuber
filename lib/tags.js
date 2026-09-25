// Tags de conteúdo: listagem e cadastro (sem nomes repetidos).
import { sql } from './db.js';
import { ErroValidacao } from './validar.js';
import { ErroConflito } from './vtubers.js';

const MAX_NOME = 30;

// "  Música  Ao Vivo " -> "musica ao vivo" (ignora acentos, maiúsculas e espaços extras)
export const normalizarNome = texto => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();

export const idDaTag = nome => normalizarNome(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export async function listarTags() {
    return sql('SELECT id, nome_pt AS pt, nome_en AS en FROM tags ORDER BY ordem');
}

export async function idsDasTags() {
    return (await listarTags()).map(tag => tag.id);
}

function limparNome(valor, idioma) {
    const nome = String(valor || '').replace(/\s+/g, ' ').trim();
    if (!nome) throw new ErroValidacao(`Informe o nome da tag em ${idioma}.`);
    if (nome.length > MAX_NOME) throw new ErroValidacao(`O nome em ${idioma} pode ter até ${MAX_NOME} caracteres.`);
    if (/[<>]/.test(nome)) throw new ErroValidacao(`O nome em ${idioma} não pode ter < ou >.`);
    return nome;
}

// Procura uma tag existente com o mesmo id ou com algum nome igual (em qualquer idioma).
export function tagRepetida(existentes, { pt, en }) {
    const id = idDaTag(pt);
    const nomes = [normalizarNome(pt), normalizarNome(en)];
    return existentes.find(tag =>
        tag.id === id || [tag.pt, tag.en].some(nome => nomes.includes(normalizarNome(nome))));
}

export async function criarTag(corpo) {
    const pt = limparNome(corpo?.pt, 'português');
    const en = limparNome(corpo?.en, 'inglês');
    const id = idDaTag(pt);
    if (!id) throw new ErroValidacao('O nome em português precisa ter letras ou números.');

    const repetida = tagRepetida(await listarTags(), { pt, en });
    if (repetida) throw new ErroConflito(`Já existe a tag "${repetida.pt}" (${repetida.en}).`);

    try {
        await sql('INSERT INTO tags (id, nome_pt, nome_en) VALUES ($1, $2, $3)', [id, pt, en]);
    } catch (e) {
        // Cadastro simultâneo com o mesmo nome: o índice único do banco barra.
        if (e.code === '23505') throw new ErroConflito('Essa tag acabou de ser cadastrada.');
        throw e;
    }
    return { id, pt, en };
}
