// Opções cadastráveis pelo painel: tags de conteúdo, plataformas e idiomas (sem nomes repetidos no grupo).
import { sql } from './db.js';
import { ErroValidacao } from './validar.js';
import { ErroConflito } from './vtubers.js';

export const GRUPOS = ['tags', 'plataforma', 'idioma'];
const JA_EXISTE = { tags: 'Já existe a tag', plataforma: 'Já existe a plataforma', idioma: 'Já existe o idioma' };
const MAX_NOME = 30;

// "  Música  Ao Vivo " -> "musica ao vivo" (ignora acentos, maiúsculas e espaços extras)
export const normalizarNome = texto => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();

export const idDaTag = nome => normalizarNome(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

// [{ grupo, id, pt, en }]
export async function listarTags() {
    return sql('SELECT grupo, id, nome_pt AS pt, nome_en AS en FROM tags ORDER BY grupo, ordem');
}

// { tags: [ids], plataforma: [ids], idioma: [ids] } — usado para validar as vtubers
export async function opcoesPorGrupo() {
    const opcoes = Object.fromEntries(GRUPOS.map(grupo => [grupo, []]));
    for (const tag of await listarTags()) opcoes[tag.grupo]?.push(tag.id);
    return opcoes;
}

function limparNome(valor, idioma) {
    const nome = String(valor || '').replace(/\s+/g, ' ').trim();
    if (!nome) throw new ErroValidacao(`Informe o nome em ${idioma}.`);
    if (nome.length > MAX_NOME) throw new ErroValidacao(`O nome em ${idioma} pode ter até ${MAX_NOME} caracteres.`);
    if (/[<>]/.test(nome)) throw new ErroValidacao(`O nome em ${idioma} não pode ter < ou >.`);
    return nome;
}

// Procura, no mesmo grupo, uma opção com o mesmo id ou com algum nome igual (em qualquer idioma).
export function tagRepetida(existentes, { grupo, pt, en }) {
    const id = idDaTag(pt);
    const nomes = [normalizarNome(pt), normalizarNome(en)];
    return existentes.find(tag => tag.grupo === grupo &&
        (tag.id === id || [tag.pt, tag.en].some(nome => nomes.includes(normalizarNome(nome)))));
}

export async function criarTag(corpo) {
    const grupo = corpo?.grupo ?? 'tags';
    if (!GRUPOS.includes(grupo)) throw new ErroValidacao('Grupo inválido.');
    const pt = limparNome(corpo?.pt, 'português');
    const en = limparNome(corpo?.en, 'inglês');
    const id = idDaTag(pt);
    if (!id) throw new ErroValidacao('O nome em português precisa ter letras ou números.');

    const repetida = tagRepetida(await listarTags(), { grupo, pt, en });
    if (repetida) throw new ErroConflito(`${JA_EXISTE[grupo]} "${repetida.pt}" (${repetida.en}).`);

    try {
        await sql('INSERT INTO tags (grupo, id, nome_pt, nome_en) VALUES ($1, $2, $3, $4)', [grupo, id, pt, en]);
    } catch (e) {
        // Cadastro simultâneo com o mesmo nome: o índice único do banco barra.
        if (e.code === '23505') throw new ErroConflito('Essa opção acabou de ser cadastrada.');
        throw e;
    }
    return { grupo, id, pt, en };
}
