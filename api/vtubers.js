// Público: GET /api/vtubers (lista) e GET /api/vtubers?id=<id> (perfil completo)
import { json, erro, rota } from '../lib/http.js';
import { listarVtubers, buscarVtuber } from '../lib/vtubers.js';

// A CDN considera a resposta nova por 60s. Depois disso, por até 7 dias, ela continua sendo
// entregue na hora enquanto a Vercel busca a versão atualizada no banco em segundo plano.
// Assim o visitante nunca espera o Neon "acordar"; alterações do admin aparecem em ~1 minuto
// (a primeira visita depois disso ainda recebe a versão anterior e dispara a atualização).
const CACHE = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=604800' };

export const GET = rota(async request => {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json(await listarVtubers(), 200, CACHE);

    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, CACHE) : erro('Vtuber não encontrada.', 404);
});
