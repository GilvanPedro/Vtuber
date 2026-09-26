// Público: GET /api/vtubers (lista) e GET /api/vtubers?id=<id> (perfil completo)
import { json, erro, rota } from '../lib/http.js';
import { listarVtubers, buscarVtuber } from '../lib/vtubers.js';
import { atualizarVarias } from '../lib/estatisticas.js';
import { CACHE_PUBLICO as CACHE } from '../lib/cache.js';

// Antes de montar a lista, busca nas APIs da Twitch/YouTube os números que faltam ou têm mais de 20h,
// para o catálogo ordenar por seguidores com os valores reais (sem depender da tarefa diária ter rodado).
// Como a lista fica em cache na CDN, isso acontece no máximo ~1x por dia e só para quem precisa.
const ATUALIZAR_SE_MAIS_ANTIGO_QUE_HORAS = 20;
const TEMPO_MAXIMO_MS = 8000;

export const GET = rota(async request => {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
        await atualizarVarias({ desatualizadasHaHoras: ATUALIZAR_SE_MAIS_ANTIGO_QUE_HORAS, limiteMs: TEMPO_MAXIMO_MS })
            .catch(e => console.error('Atualização de seguidores na lista:', e.message));
        return json(await listarVtubers(), 200, CACHE);
    }

    const vt = await buscarVtuber(id);
    return vt ? json(vt, 200, CACHE) : erro('Vtuber não encontrada.', 404);
});
