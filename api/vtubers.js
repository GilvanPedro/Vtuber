// Público: GET /api/vtubers (lista) e GET /api/vtubers?id=<id> (perfil completo)
import { json, erro, rota } from '../lib/http.js';
import { listarVtubers, buscarVtuber } from '../lib/vtubers.js';
import { CACHE_PUBLICO as CACHE } from '../lib/cache.js';

export const GET = rota(async request => {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json(await listarVtubers(), 200, CACHE);

    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, CACHE) : erro('Vtuber não encontrada.', 404);
});
