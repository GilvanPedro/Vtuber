// Testa as chaves da Twitch e do YouTube do .env com links reais.
// Uso: npm run testar-estatisticas -- https://www.twitch.tv/<canal> https://www.youtube.com/@<canal>
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { seguidoresNaTwitch, inscritosNoYoutube } = await import('../lib/estatisticas.js');

const links = process.argv.slice(2);
if (!links.length) {
    console.log('Informe links, ex.: npm run testar-estatisticas -- https://www.twitch.tv/toshiruz https://www.youtube.com/@toshiruzlives');
    process.exit(1);
}
for (const link of links) {
    const twitch = link.includes('twitch.tv');
    const faltando = twitch
        ? !process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET ? 'TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET' : null
        : !process.env.YOUTUBE_API_KEY ? 'YOUTUBE_API_KEY' : null;
    if (faltando) { console.log(`${link}\n  ✗ falta ${faltando} no .env`); continue; }
    try {
        const valor = twitch ? await seguidoresNaTwitch(link) : await inscritosNoYoutube(link);
        console.log(`${link}\n  ${valor == null ? '✗ não encontrado (link não reconhecido ou número escondido)' : `✓ ${valor.toLocaleString('pt-BR')} ${twitch ? 'seguidores' : 'inscritos'}`}`);
    } catch (e) {
        console.log(`${link}\n  ✗ erro: ${e.message}`);
    }
}
