// Admin (precisa estar logado):
//   GET    /api/admin/vtubers           -> lista (sem cache)
//   GET    /api/admin/vtubers?id=<id>   -> dados completos para edição (sem cache)
//   POST   /api/admin/vtubers           -> cria
//   PUT    /api/admin/vtubers?id=<id>   -> atualiza (pode trocar o id)
//   DELETE /api/admin/vtubers?id=<id>   -> exclui
import { json, erro } from '../../lib/http.js';
import { protegida, SEM_CACHE } from '../../lib/admin.js';
import { validarVtuber } from '../../lib/validar.js';
import { idsDasTags } from '../../lib/tags.js';
import { listarVtubers, buscarVtuber, criarVtuber, atualizarVtuber, excluirVtuber } from '../../lib/vtubers.js';

const lerVtuber = async request =>
    validarVtuber(await request.json().catch(() => null), { tags: await idsDasTags() });

export const GET = protegida(async (request, id) => {
    if (!id) return json(await listarVtubers(), 200, SEM_CACHE);
    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, SEM_CACHE) : erro('Vtuber não encontrada.', 404);
});

export const POST = protegida(async request => {
    const vt = await lerVtuber(request);
    if (!vt.imagens.card) return erro('Envie a imagem do card.', 400);
    return json(await criarVtuber(vt), 201, SEM_CACHE);
});

export const PUT = protegida(async (request, id) => {
    if (!id) return erro('Vtuber não encontrada.', 404);
    return json(await atualizarVtuber(id, await lerVtuber(request)), 200, SEM_CACHE);
});

export const DELETE = protegida(async (request, id) => {
    if (!id || !(await excluirVtuber(id))) return erro('Vtuber não encontrada.', 404);
    return json({ ok: true }, 200, SEM_CACHE);
});
