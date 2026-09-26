// Atualização diária dos seguidores/inscritos de todas as vtubers (Cron Job da Vercel, ver vercel.json).
// A Vercel chama esta rota com "Authorization: Bearer <CRON_SECRET>"; sem esse segredo, ela recusa.
// (A lista pública também completa sozinha os números que faltam; esta rota garante todos atualizados 1x por dia.)
import { json, erro, rota } from '../../lib/http.js';
import { atualizarVarias } from '../../lib/estatisticas.js';
import { limparCachePublico } from '../../lib/cache.js';

export const GET = rota(async request => {
    const segredo = process.env.CRON_SECRET;
    if (!segredo) return erro('Defina CRON_SECRET nas variáveis de ambiente.', 500);
    if (request.headers.get('authorization') !== `Bearer ${segredo}`) return erro('Não autorizado.', 401);

    const resultado = await atualizarVarias();
    await limparCachePublico(); // o catálogo passa a ordenar com os números novos
    return json(resultado, 200, { 'Cache-Control': 'no-store' });
});
