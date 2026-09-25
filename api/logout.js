// POST /api/logout -> apaga o cookie de sessão
import { json, rota } from '../lib/http.js';
import { cookieDeSaida } from '../lib/auth.js';

export const POST = rota(async request => json({ ok: true }, 200, { 'Set-Cookie': cookieDeSaida(request) }));
