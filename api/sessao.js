// GET /api/sessao -> { logado: bool }
import { json, rota } from '../lib/http.js';
import { autenticado } from '../lib/auth.js';

export const GET = rota(async request =>
    json({ logado: autenticado(request) }, 200, { 'Cache-Control': 'no-store' }));
