// Consultas e gravações de vtubers compartilhadas pela API e pelo script de seed.
import { sql } from './db.js';

const CAMPOS_PUBLICOS = `
    v.id, v.nome, v.cor, v.tags, v.horario, v.plataforma, v.idioma,
    (SELECT extract(epoch FROM i.atualizado_em)::bigint FROM imagens i
      WHERE i.vtuber_id = v.id AND i.tipo = 'card') AS versao_card,
    (SELECT extract(epoch FROM i.atualizado_em)::bigint FROM imagens i
      WHERE i.vtuber_id = v.id AND i.tipo = 'perfil') AS versao_perfil`;

const urlImagem = (id, tipo, versao) =>
    versao == null ? null : `/api/imagem?id=${encodeURIComponent(id)}&tipo=${tipo}&v=${versao}`;

function formatar({ versao_card, versao_perfil, ...vt }) {
    return {
        ...vt,
        img: urlImagem(vt.id, 'card', versao_card),
        // Sem imagem de perfil, o perfil usa a imagem do card.
        imgPerfil: urlImagem(vt.id, 'perfil', versao_perfil) ?? urlImagem(vt.id, 'card', versao_card)
    };
}

export async function listarVtubers() {
    const linhas = await sql(`SELECT ${CAMPOS_PUBLICOS} FROM vtubers v ORDER BY v.criado_em DESC, v.nome`);
    return linhas.map(formatar);
}

export async function buscarVtuber(id) {
    const [linha] = await sql(
        `SELECT ${CAMPOS_PUBLICOS}, v.bio, v.redes, v.videos FROM vtubers v WHERE v.id = $1`, [id]);
    return linha ? formatar(linha) : null;
}

export async function existe(id) {
    const [linha] = await sql('SELECT 1 FROM vtubers WHERE id = $1', [id]);
    return Boolean(linha);
}

const j = valor => JSON.stringify(valor);

export async function criarVtuber(vt, criadoEm) {
    await sql(
        `INSERT INTO vtubers (id, nome, cor, tags, horario, plataforma, idioma, bio, redes, videos, criado_em)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::jsonb, $10::jsonb, COALESCE($11::timestamptz, now()))`,
        [vt.id, vt.nome, vt.cor, j(vt.tags), j(vt.horario), j(vt.plataforma), j(vt.idioma),
            vt.bio, j(vt.redes), j(vt.videos), criadoEm ?? null]);
    await salvarImagens(vt.id, vt.imagens);
}

export async function atualizarVtuber(idAtual, vt) {
    await sql(
        `UPDATE vtubers SET id = $2, nome = $3, cor = $4, tags = $5::jsonb, horario = $6::jsonb,
            plataforma = $7::jsonb, idioma = $8::jsonb, bio = $9, redes = $10::jsonb, videos = $11::jsonb,
            atualizado_em = now()
         WHERE id = $1`,
        [idAtual, vt.id, vt.nome, vt.cor, j(vt.tags), j(vt.horario), j(vt.plataforma), j(vt.idioma),
            vt.bio, j(vt.redes), j(vt.videos)]);
    await salvarImagens(vt.id, vt.imagens);
}

export async function excluirVtuber(id) {
    const linhas = await sql('DELETE FROM vtubers WHERE id = $1 RETURNING id', [id]);
    return linhas.length > 0;
}

async function salvarImagens(id, imagens) {
    for (const tipo of ['card', 'perfil']) {
        const img = imagens?.[tipo];
        if (!img) continue;
        await sql(
            `INSERT INTO imagens (vtuber_id, tipo, mime, dados, atualizado_em)
             VALUES ($1, $2, $3, decode($4, 'base64'), now())
             ON CONFLICT (vtuber_id, tipo)
             DO UPDATE SET mime = EXCLUDED.mime, dados = EXCLUDED.dados, atualizado_em = now()`,
            [id, tipo, img.mime, img.base64]);
    }
}

export async function lerImagem(id, tipo) {
    const [linha] = await sql(
        `SELECT mime, encode(dados, 'base64') AS base64 FROM imagens WHERE vtuber_id = $1 AND tipo = $2`,
        [id, tipo]);
    return linha ? { mime: linha.mime, dados: Buffer.from(linha.base64, 'base64') } : null;
}
