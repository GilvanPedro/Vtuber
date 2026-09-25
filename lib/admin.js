// Proteção das rotas do painel: exige login, bloqueia CSRF e traduz erros em respostas HTTP.
import { erro, rota } from './http.js';
import { autenticado } from './auth.js';
import { ErroValidacao } from './validar.js';
import { ErroConflito, ErroNaoEncontrado } from './vtubers.js';

export const SEM_CACHE = { 'Cache-Control': 'no-store' };

// Remove connection strings/senhas da mensagem antes de mostrar no painel.
const mensagemSegura = e => String(e?.message || e)
    .replace(/postgres(ql)?:\/\/\S+/gi, '<connection string>')
    .replace(/password=\S+/gi, 'password=***')
    .slice(0, 300);

export const protegida = handler => rota(async request => {
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
