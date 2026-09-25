// Sessão do painel admin: cookie HttpOnly assinado com HMAC (sem guardar nada no banco).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'vt_sessao';
const DURACAO_S = 60 * 60 * 12; // 12 horas

function segredo() {
    const s = process.env.SESSION_SECRET;
    if (!s || s.length < 32) throw new Error('SESSION_SECRET precisa ter pelo menos 32 caracteres.');
    return s;
}

const assinar = valor => createHmac('sha256', segredo()).update(valor).digest('base64url');

function iguais(a, b) {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
}

export function senhaCorreta(senha) {
    const esperada = process.env.ADMIN_PASSWORD;
    if (!esperada) throw new Error('ADMIN_PASSWORD não configurada.');
    return typeof senha === 'string' && iguais(senha, esperada);
}

function atributos(request, maxAge) {
    const seguro = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${seguro}`;
}

export function cookieDeSessao(request) {
    const expira = String(Math.floor(Date.now() / 1000) + DURACAO_S);
    return `${COOKIE}=${expira}.${assinar(expira)}; ${atributos(request, DURACAO_S)}`;
}

export function cookieDeSaida(request) {
    return `${COOKIE}=; ${atributos(request, 0)}`;
}

export function autenticado(request) {
    const cookies = request.headers.get('cookie') || '';
    const valor = cookies.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!valor) return false;
    const [expira, assinatura] = valor.split('.');
    if (!expira || !assinatura || !iguais(assinatura, assinar(expira))) return false;
    return Number(expira) > Date.now() / 1000;
}
