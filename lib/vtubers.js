// Consultas e gravações de vtubers compartilhadas pela API e pelos scripts.
import { sql, transacao } from './db.js';
import { gerarVariantes } from './imagens.js';

export class ErroConflito extends Error {}
export class ErroNaoEncontrado extends Error {}

// Versões (timestamp) das imagens de cada vtuber: { card, mini, perfil }
const CAMPOS_PUBLICOS = `
    v.id, v.nome, v.cor, v.tags, v.horario, v.plataforma, v.idioma,
    (SELECT jsonb_object_agg(i.tipo, extract(epoch FROM i.atualizado_em)::bigint)
       FROM imagens i WHERE i.vtuber_id = v.id) AS versoes`;

const SELECT_COMPLETO = `SELECT ${CAMPOS_PUBLICOS}, v.bio, v.bio_en AS "bioEn", v.redes, v.videos FROM vtubers v WHERE v.id = $1`;

const urlImagem = (id, tipo, versoes) =>
    versoes?.[tipo] == null ? null : `/api/imagem?id=${encodeURIComponent(id)}&tipo=${tipo}&v=${versoes[tipo]}`;

function formatar({ versoes, ...vt }) {
    const card = urlImagem(vt.id, 'card', versoes);
    return {
        ...vt,
        img: card,
        imgMini: urlImagem(vt.id, 'mini', versoes) ?? card,
        // Sem imagem de perfil, o perfil usa a imagem do card.
        imgPerfil: urlImagem(vt.id, 'perfil', versoes) ?? card
    };
}

export async function listarVtubers() {
    const linhas = await sql(`SELECT ${CAMPOS_PUBLICOS} FROM vtubers v ORDER BY v.criado_em DESC, v.nome`);
    return linhas.map(formatar);
}

export async function buscarVtuber(id) {
    const [linha] = await sql(SELECT_COMPLETO, [id]);
    return linha ? formatar(linha) : null;
}

export async function existe(id) {
    const [linha] = await sql('SELECT 1 FROM vtubers WHERE id = $1', [id]);
    return Boolean(linha);
}

const j = valor => JSON.stringify(valor);

// Converte as imagens enviadas nas versões otimizadas e monta os INSERTs.
// Com "soNaLinhaGravada", só grava se a vtuber foi criada/atualizada nesta mesma transação
// (now() é constante dentro dela); assim um id inexistente nunca mexe nas imagens de outra vtuber.
async function consultasDeImagens(id, imagens, { soNaLinhaGravada = true } = {}) {
    const variantes = (await Promise.all(
        ['card', 'perfil'].filter(origem => imagens?.[origem]).map(origem => gerarVariantes(origem, imagens[origem]))
    )).flat();

    const condicao = soNaLinhaGravada
        ? 'WHERE EXISTS (SELECT 1 FROM vtubers WHERE id = $1 AND atualizado_em = now())'
        : '';
    return variantes.map(img => [
        `INSERT INTO imagens (vtuber_id, tipo, mime, dados, atualizado_em)
         SELECT $1, $2, $3, decode($4, 'base64'), now() ${condicao}
         ON CONFLICT (vtuber_id, tipo)
         DO UPDATE SET mime = EXCLUDED.mime, dados = EXCLUDED.dados, atualizado_em = now()`,
        [id, img.tipo, img.mime, img.base64]
    ]);
}

// Roda a transação e devolve a vtuber salva (última consulta); traduz erros do Postgres.
async function salvar(consultas, id) {
    try {
        const resultados = await transacao([...consultas, [`${SELECT_COMPLETO} AND v.atualizado_em = now()`, [id]]]);
        const [linha] = resultados.at(-1);
        if (!linha) throw new ErroNaoEncontrado('Vtuber não encontrada.');
        return formatar(linha);
    } catch (e) {
        if (e.code === '23505') throw new ErroConflito(`Já existe uma vtuber com o identificador "${id}".`);
        if (e.code === '23503') throw new ErroNaoEncontrado('Vtuber não encontrada.');
        throw e;
    }
}

export async function criarVtuber(vt, criadoEm) {
    return salvar([
        [`INSERT INTO vtubers (id, nome, cor, tags, horario, plataforma, idioma, bio, bio_en, redes, videos, criado_em)
          VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, $11::jsonb,
                  COALESCE($12::timestamptz, now()))`,
            [vt.id, vt.nome, vt.cor, j(vt.tags), j(vt.horario), j(vt.plataforma), j(vt.idioma),
                vt.bio, vt.bioEn, j(vt.redes), j(vt.videos), criadoEm ?? null]],
        ...await consultasDeImagens(vt.id, vt.imagens)
    ], vt.id);
}

export async function atualizarVtuber(idAtual, vt) {
    return salvar([
        [`UPDATE vtubers SET id = $2, nome = $3, cor = $4, tags = $5::jsonb, horario = $6::jsonb,
             plataforma = $7::jsonb, idioma = $8::jsonb, bio = $9, bio_en = $10, redes = $11::jsonb,
             videos = $12::jsonb, atualizado_em = now()
          WHERE id = $1`,
            [idAtual, vt.id, vt.nome, vt.cor, j(vt.tags), j(vt.horario), j(vt.plataforma), j(vt.idioma),
                vt.bio, vt.bioEn, j(vt.redes), j(vt.videos)]],
        ...await consultasDeImagens(vt.id, vt.imagens)
    ], vt.id);
}

export async function excluirVtuber(id) {
    const linhas = await sql('DELETE FROM vtubers WHERE id = $1 RETURNING id', [id]);
    return linhas.length > 0;
}

export async function lerImagem(id, tipo) {
    const [linha] = await sql(
        `SELECT mime, encode(dados, 'base64') AS base64 FROM imagens WHERE vtuber_id = $1 AND tipo = $2`,
        [id, tipo]);
    return linha ? { mime: linha.mime, dados: Buffer.from(linha.base64, 'base64') } : null;
}

// Usado pelo script de otimização: reprocessa as imagens já salvas no banco.
export async function reprocessarImagens(id) {
    const originais = await sql(
        `SELECT tipo, encode(dados, 'base64') AS base64 FROM imagens
          WHERE vtuber_id = $1 AND tipo IN ('card', 'perfil')`, [id]);
    const imagens = Object.fromEntries(originais.map(o => [o.tipo, { base64: o.base64 }]));
    const consultas = await consultasDeImagens(id, imagens, { soNaLinhaGravada: false });
    if (consultas.length) await transacao(consultas);
    return consultas.length;
}
