// Admin (precisa estar logado):
//   GET    /api/admin/vtubers           -> lista (sem cache)
//   GET    /api/admin/vtubers?id=<id>   -> dados completos para edição (sem cache)
//   POST   /api/admin/vtubers           -> cria
//   PUT    /api/admin/vtubers?id=<id>   -> atualiza (pode trocar o id)
//   DELETE /api/admin/vtubers?id=<id>   -> exclui
import { json, erro, rota } from '../../lib/http.js';
import { autenticado } from '../../lib/auth.js';
import { validarVtuber, ErroValidacao } from '../../lib/validar.js';
import {
    listarVtubers, buscarVtuber, criarVtuber, atualizarVtuber, excluirVtuber, ErroConflito, ErroNaoEncontrado
} from '../../lib/vtubers.js';

const SEM_CACHE = { 'Cache-Control': 'no-store' };

// Remove connection strings/senhas da mensagem antes de mostrar no painel.
const mensagemSegura = e => String(e?.message || e)
    .replace(/postgres(ql)?:\/\/\S+/gi, '<connection string>')
    .replace(/password=\S+/gi, 'password=***')
    .slice(0, 300);

const protegida = handler => rota(async request => {
    if (!autenticado(request)) return erro('Faça login para continuar.', 401);
    // Bloqueia requisições vindas de outros sites (CSRF); o cookie já é SameSite=Strict.
    const origem = request.headers.get('origin');
    if (request.method !== 'GET' && origem && origem !== new URL(request.url).origin) {
        return erro('Origem não permitida.', 403);
    }
    try {
        return await handler(request, new URL(request.url).searchParams.get('id'));
    } catch (e) {
        if (e instanceof ErroConflito) return erro(e.message, 409);
        if (e instanceof ErroNaoEncontrado) return erro(e.message, 404);
        if (e instanceof ErroValidacao) throw e;
        // Só quem está logado vê o motivo real (útil para diagnosticar a conexão com o banco).
        console.error(e);
        return erro(`Erro no servidor: ${mensagemSegura(e)}`, 500);
    }
});

export const GET = protegida(async (request, id) => {
    if (!id) return json(await listarVtubers(), 200, SEM_CACHE);
    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, SEM_CACHE) : erro('Vtuber não encontrada.', 404);
});

export const POST = protegida(async request => {
    const vt = validarVtuber(await request.json().catch(() => null));
    if (!vt.imagens.card) return erro('Envie a imagem do card.', 400);
    return json(await criarVtuber(vt), 201, SEM_CACHE);
});

export const PUT = protegida(async (request, id) => {
    if (!id) return erro('Vtuber não encontrada.', 404);
    const vt = validarVtuber(await request.json().catch(() => null));
    return json(await atualizarVtuber(id, vt), 200, SEM_CACHE);
});

export const DELETE = protegida(async (request, id) => {
    if (!id || !(await excluirVtuber(id))) return erro('Vtuber não encontrada.', 404);
    return json({ ok: true }, 200, SEM_CACHE);
});
