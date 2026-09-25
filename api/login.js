// POST /api/login { senha } -> define o cookie de sessão do admin
import { json, erro, rota } from '../lib/http.js';
import { senhaCorreta, cookieDeSessao } from '../lib/auth.js';

export const POST = rota(async request => {
    const { senha } = await request.json().catch(() => ({}));
    if (!senhaCorreta(senha)) {
        await new Promise(r => setTimeout(r, 800)); // atrasa tentativas de adivinhar a senha
        return erro('Senha incorreta.', 401);
    }
    return json({ ok: true }, 200, { 'Set-Cookie': cookieDeSessao(request) });
});
