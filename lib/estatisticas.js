// Seguidores na Twitch e inscritos no YouTube, a partir dos links cadastrados em "Redes sociais".
import { salvarEstatisticas } from './vtubers.js';
// Precisa das variáveis TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET e YOUTUBE_API_KEY (ver .env.example).
// Sem elas, a plataforma correspondente simplesmente não é consultada.

const TEMPO_LIMITE_MS = 6000;

async function buscarJson(url, opcoes = {}) {
    const resposta = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!resposta.ok) throw new Error(`${new URL(url).hostname} respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 200)}`);
    return resposta.json();
}

// ---------- Twitch ----------
// "https://www.twitch.tv/nome" -> "nome"
export function loginDaTwitch(link) {
    try {
        const url = new URL(link);
        if (!/(^|\.)twitch\.tv$/.test(url.hostname)) return null;
        const login = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
        return /^[a-z0-9_]{3,25}$/.test(login || '') && !['videos', 'directory', 'settings'].includes(login) ? login : null;
    } catch {
        return null;
    }
}

let tokenTwitch = null; // { valor, expiraEm } — reaproveitado entre requisições enquanto a função estiver ativa

async function obterTokenTwitch() {
    if (tokenTwitch && tokenTwitch.expiraEm > Date.now() + 60_000) return tokenTwitch.valor;
    const params = new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
    });
    const dados = await buscarJson(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' });
    tokenTwitch = { valor: dados.access_token, expiraEm: Date.now() + dados.expires_in * 1000 };
    return tokenTwitch.valor;
}

async function helix(caminho) {
    const cabecalhos = { 'Client-Id': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${await obterTokenTwitch()}` };
    return buscarJson(`https://api.twitch.tv/helix/${caminho}`, { headers: cabecalhos });
}

// Retorna o número, null (sem link válido/canal inexistente) ou undefined (API não configurada).
export async function seguidoresNaTwitch(link) {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return undefined;
    const login = loginDaTwitch(link);
    if (!login) return null;
    const usuario = (await helix(`users?login=${encodeURIComponent(login)}`)).data?.[0];
    if (!usuario) return null;
    // Sem ser a própria streamer/moderador, a Twitch devolve só o total, que é o que queremos.
    const { total } = await helix(`channels/followers?broadcaster_id=${usuario.id}&first=1`);
    return typeof total === 'number' ? total : null;
}

// ---------- YouTube ----------
// Aceita youtube.com/@handle, /channel/UC..., /user/nome. Links antigos (/c/nome ou /nome) não têm
// busca direta na API: tenta como @nome, que costuma ser o mesmo; se não existir, o contador não aparece.
const CAMINHOS_DO_YOUTUBE = ['watch', 'shorts', 'playlist', 'results', 'feed', 'live', 'embed', 'channel', 'user', 'c'];

export function canalDoYoutube(link) {
    try {
        const url = new URL(link);
        if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;
        const [primeira, segunda] = url.pathname.split('/').filter(Boolean);
        if (primeira?.startsWith('@')) return { forHandle: primeira };
        if (primeira === 'channel' && /^UC[\w-]{22}$/.test(segunda || '')) return { id: segunda };
        if (primeira === 'user' && segunda) return { forUsername: segunda };
        if (primeira === 'c' && segunda) return { forHandle: `@${segunda}` };
        if (primeira && !CAMINHOS_DO_YOUTUBE.includes(primeira)) return { forHandle: `@${primeira}` };
        return null;
    } catch {
        return null;
    }
}

// Retorna o número, null (sem link válido/canal inexistente/número escondido) ou undefined (API não configurada).
export async function inscritosNoYoutube(link) {
    if (!process.env.YOUTUBE_API_KEY) return undefined;
    const canal = canalDoYoutube(link);
    if (!canal) return null;
    const params = new URLSearchParams({ part: 'statistics', key: process.env.YOUTUBE_API_KEY, ...canal });
    const estatisticas = (await buscarJson(`https://www.googleapis.com/youtube/v3/channels?${params}`)).items?.[0]?.statistics;
    if (!estatisticas || estatisticas.hiddenSubscriberCount) return null; // canal esconde o número
    return Number(estatisticas.subscriberCount);
}

// ---------- Junta as duas ----------
// { twitch, youtube, atualizadoEm, falhas: { twitch, youtube } }
// "falhas" marca quando não deu para consultar (erro ou API sem chave): nesse caso o valor salvo no banco é mantido.
export async function estatisticasDasRedes(redes = {}) {
    const [twitch, youtube] = await Promise.allSettled([
        redes.twitch ? seguidoresNaTwitch(redes.twitch) : null,
        redes.youtube ? inscritosNoYoutube(redes.youtube) : null
    ]);
    for (const [nome, resultado] of [['da Twitch', twitch], ['do YouTube', youtube]]) {
        if (resultado.status === 'rejected') console.error(`Estatísticas ${nome}:`, resultado.reason?.message);
    }
    const valor = r => (r.status === 'fulfilled' ? r.value ?? null : null);
    const falhou = r => r.status === 'rejected' || r.value === undefined;
    return {
        twitch: valor(twitch),
        youtube: valor(youtube),
        atualizadoEm: new Date().toISOString(),
        falhas: { twitch: falhou(twitch), youtube: falhou(youtube) }
    };
}

// Consulta as duas plataformas e grava no banco (usado pelo perfil, pelo painel e pela atualização diária).
export async function atualizarEstatisticas(id, redes) {
    const resultado = await estatisticasDasRedes(redes);
    await salvarEstatisticas(id, resultado);
    return resultado;
}
