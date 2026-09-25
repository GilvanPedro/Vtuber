// Público: GET /api/estatisticas?id=<id> -> { twitch: seguidores | null, youtube: inscritos | null, atualizadoEm }
// Usa os links de Twitch/YouTube cadastrados na vtuber (nunca links vindos do visitante).
import { json, erro, rota } from '../lib/http.js';
import { buscarVtuber } from '../lib/vtubers.js';
import { estatisticasDasRedes } from '../lib/estatisticas.js';

// 15 minutos na CDN: os números se atualizam sozinhos sem gastar a cota das APIs a cada visita.
// A tag faz o cache ser limpo quando a vtuber é editada no painel (ex.: link novo).
const CACHE = {
    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400',
    'Vercel-Cache-Tag': 'dados-publicos'
};

export const GET = rota(async request => {
    const id = new URL(request.url).searchParams.get('id');
    const vt = id && await buscarVtuber(id);
    if (!vt) return erro('Vtuber não encontrada.', 404);
    return json(await estatisticasDasRedes(vt.redes), 200, CACHE);
});
