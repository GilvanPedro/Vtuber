// Admin (precisa estar logado):
//   GET    /api/admin/vtubers           -> lista (sem cache)
//   GET    /api/admin/vtubers?id=<id>   -> dados completos para edição (sem cache)
//   POST   /api/admin/vtubers           -> cria
//   PUT    /api/admin/vtubers?id=<id>   -> atualiza (pode trocar o id)
//   DELETE /api/admin/vtubers?id=<id>   -> exclui
import { json, erro, rota } from '../../lib/http.js';
import { autenticado } from '../../lib/auth.js';
import { validarVtuber } from '../../lib/validar.js';
import { listarVtubers, buscarVtuber, existe, criarVtuber, atualizarVtuber, excluirVtuber } from '../../lib/vtubers.js';

const SEM_CACHE = { 'Cache-Control': 'no-store' };

const protegida = handler => rota(async request => {
    if (!autenticado(request)) return erro('Faça login para continuar.', 401);
    // Bloqueia requisições vindas de outros sites (CSRF); o cookie já é SameSite=Strict.
    const origem = request.headers.get('origin');
    if (request.method !== 'GET' && origem && origem !== new URL(request.url).origin) {
        return erro('Origem não permitida.', 403);
    }
    return handler(request, new URL(request.url).searchParams.get('id'));
});

export const GET = protegida(async (request, id) => {
    if (!id) return json(await listarVtubers(), 200, SEM_CACHE);
    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, SEM_CACHE) : erro('Vtuber não encontrada.', 404);
});

export const POST = protegida(async request => {
    const vt = validarVtuber(await request.json().catch(() => null));
    if (await existe(vt.id)) return erro(`Já existe uma vtuber com o identificador "${vt.id}".`, 409);
    if (!vt.imagens.card) return erro('Envie a imagem do card.', 400);
    await criarVtuber(vt);
    return json(await buscarVtuber(vt.id), 201, SEM_CACHE);
});

export const PUT = protegida(async (request, id) => {
    if (!id || !(await existe(id))) return erro('Vtuber não encontrada.', 404);
    const vt = validarVtuber(await request.json().catch(() => null));
    if (vt.id !== id && await existe(vt.id)) {
        return erro(`Já existe uma vtuber com o identificador "${vt.id}".`, 409);
    }
    await atualizarVtuber(id, vt);
    return json(await buscarVtuber(vt.id), 200, SEM_CACHE);
});

export const DELETE = protegida(async (request, id) => {
    if (!id || !(await excluirVtuber(id))) return erro('Vtuber não encontrada.', 404);
    return json({ ok: true }, 200, SEM_CACHE);
});
