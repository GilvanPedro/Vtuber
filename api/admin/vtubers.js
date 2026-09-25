// Admin (precisa estar logado):
//   GET    /api/admin/vtubers           -> lista (sem cache)
//   GET    /api/admin/vtubers?id=<id>   -> dados completos para edição (sem cache)
//   POST   /api/admin/vtubers           -> cria
//   PUT    /api/admin/vtubers?id=<id>   -> atualiza (pode trocar o id)
//   DELETE /api/admin/vtubers?id=<id>   -> exclui
import { json, erro } from '../../lib/http.js';
import { protegida, SEM_CACHE } from '../../lib/admin.js';
import { validarVtuber } from '../../lib/validar.js';
import { opcoesPorGrupo } from '../../lib/tags.js';
import { listarVtubers, buscarVtuber, criarVtuber, atualizarVtuber, excluirVtuber } from '../../lib/vtubers.js';
import { limparCachePublico } from '../../lib/cache.js';
import { atualizarEstatisticas } from '../../lib/estatisticas.js';
import { waitUntil } from '@vercel/functions';

// Depois de salvar, busca seguidores/inscritos em segundo plano (não atrasa a resposta do painel).
const atualizarNumerosDepois = vt => waitUntil(
    atualizarEstatisticas(vt.id, vt.redes).catch(e => console.error('Estatísticas após salvar:', e.message)));

const lerVtuber = async request =>
    validarVtuber(await request.json().catch(() => null), { opcoes: await opcoesPorGrupo() });

export const GET = protegida(async (request, id) => {
    if (!id) return json(await listarVtubers(), 200, SEM_CACHE);
    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, SEM_CACHE) : erro('Vtuber não encontrada.', 404);
});

export const POST = protegida(async request => {
    const vt = await lerVtuber(request);
    if (!vt.imagens.card) return erro('Envie a imagem do card.', 400);
    const criada = await criarVtuber(vt);
    await limparCachePublico();
    atualizarNumerosDepois(criada);
    return json(criada, 201, SEM_CACHE);
});

export const PUT = protegida(async (request, id) => {
    if (!id) return erro('Vtuber não encontrada.', 404);
    const atualizada = await atualizarVtuber(id, await lerVtuber(request));
    await limparCachePublico();
    atualizarNumerosDepois(atualizada);
    return json(atualizada, 200, SEM_CACHE);
});

export const DELETE = protegida(async (request, id) => {
    if (!id || !(await excluirVtuber(id))) return erro('Vtuber não encontrada.', 404);
    await limparCachePublico();
    return json({ ok: true }, 200, SEM_CACHE);
});
