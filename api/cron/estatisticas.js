// Atualização diária dos seguidores/inscritos de todas as vtubers (Cron Job da Vercel, ver vercel.json).
// A Vercel chama esta rota com "Authorization: Bearer <CRON_SECRET>"; sem esse segredo, ela recusa.
import { json, erro, rota } from '../../lib/http.js';
import { vtubersComRedes } from '../../lib/vtubers.js';
import { atualizarEstatisticas } from '../../lib/estatisticas.js';
import { limparCachePublico } from '../../lib/cache.js';

const SIMULTANEAS = 4; // consultas em paralelo (respeita os limites da Twitch e do YouTube)

export const GET = rota(async request => {
    const segredo = process.env.CRON_SECRET;
    if (!segredo) return erro('Defina CRON_SECRET nas variáveis de ambiente.', 500);
    if (request.headers.get('authorization') !== `Bearer ${segredo}`) return erro('Não autorizado.', 401);

    const fila = await vtubersComRedes();
    let atualizadas = 0;
    const falhas = [];
    const trabalhar = async () => {
        for (let vt = fila.shift(); vt; vt = fila.shift()) {
            const r = await atualizarEstatisticas(vt.id, vt.redes).catch(e => ({ falhas: { erro: e.message } }));
            if (r.falhas?.erro || (vt.redes.twitch && r.falhas?.twitch) || (vt.redes.youtube && r.falhas?.youtube)) falhas.push(vt.id);
            else atualizadas++;
        }
    };
    await Promise.all(Array.from({ length: SIMULTANEAS }, trabalhar));
    await limparCachePublico(); // o catálogo passa a ordenar com os números novos
    return json({ atualizadas, falhas }, 200, { 'Cache-Control': 'no-store' });
});
