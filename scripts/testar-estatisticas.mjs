// Testa as chaves/acessos da Twitch, do YouTube e da Kick com links reais.
// Uso: npm run testar-estatisticas -- https://www.twitch.tv/<canal> https://www.youtube.com/@<canal> https://kick.com/<canal>
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { seguidoresNaTwitch, inscritosNoYoutube, seguidoresNaKick } = await import('../lib/estatisticas.js');

const PLATAFORMAS = [
    { dominio: 'twitch.tv', buscar: seguidoresNaTwitch, unidade: 'seguidores', chaves: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'] },
    { dominio: 'youtube.com', buscar: inscritosNoYoutube, unidade: 'inscritos', chaves: ['YOUTUBE_API_KEY'] },
    { dominio: 'kick.com', buscar: seguidoresNaKick, unidade: 'seguidores', chaves: [] } // a Kick não precisa de chave
];

const links = process.argv.slice(2);
if (!links.length) {
    console.log('Informe links, ex.: npm run testar-estatisticas -- https://www.twitch.tv/toshiruz https://kick.com/xqc');
    process.exit(1);
}
for (const link of links) {
    const plataforma = PLATAFORMAS.find(p => link.includes(p.dominio));
    if (!plataforma) { console.log(`${link}\n  ✗ plataforma não suportada`); continue; }
    const faltando = plataforma.chaves.filter(chave => !process.env[chave]);
    if (faltando.length) { console.log(`${link}\n  ✗ falta ${faltando.join('/')} no .env`); continue; }
    try {
        const valor = await plataforma.buscar(link);
        console.log(`${link}\n  ${valor == null ? '✗ não encontrado (link não reconhecido ou número escondido)' : `✓ ${valor.toLocaleString('pt-BR')} ${plataforma.unidade}`}`);
    } catch (e) {
        console.log(`${link}\n  ✗ erro: ${e.message}`);
    }
}
