// Respostas JSON padronizadas para as rotas da API.
import { ErroValidacao } from './validar.js';

export function json(dados, status = 200, cabecalhos = {}) {
    return new Response(JSON.stringify(dados), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cabecalhos }
    });
}

export const erro = (mensagem, status) => json({ erro: mensagem }, status);

// Envolve um handler: erros de validação viram 400, o resto vira 500 sem vazar detalhes.
export const rota = handler => async request => {
    try {
        return await handler(request);
    } catch (e) {
        if (e instanceof ErroValidacao) return erro(e.message, 400);
        console.error(e);
        return erro('Erro interno no servidor.', 500);
    }
};
