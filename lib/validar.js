// Validação dos dados enviados pelo painel admin.
// Os horários precisam bater com FILTROS em js/vtubers-data.js; tags, plataformas e idiomas vêm do banco (lib/tags.js).
const HORARIOS = ['manha', 'tarde', 'noite', 'madrugada', 'diverso'];
const REDES = ['twitch', 'youtube', 'x', 'kick', 'instagram'];
const MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGEM_BYTES = 2 * 1024 * 1024;
const MAX_VIDEOS = 10;

export class ErroValidacao extends Error {}

const falhar = msg => { throw new ErroValidacao(msg); };

// Reconhece o link de um "momento do criador" e devolve { tipo, id, vertical } (ou null):
//   youtube      -> vídeo, live ou Shorts (youtube.com, youtu.be, m.youtube.com); Shorts são verticais
//   twitch-clip  -> clipe da Twitch (clips.twitch.tv/<slug> ou twitch.tv/<canal>/clip/<slug>)
//   twitch-video -> vídeo/VOD da Twitch (twitch.tv/videos/<número>)
// A mesma regra existe em js/admin.js para mostrar o tipo enquanto o link é digitado.
export function identificarVideo(entrada) {
    const texto = String(entrada || '').trim();
    if (/^[\w-]{11}$/.test(texto)) return { tipo: 'youtube', id: texto, vertical: false }; // ID puro (dados antigos)

    let url;
    try { url = new URL(texto); } catch { return null; }
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^(www|m)\./, '');
    const partes = url.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be' || host === 'youtube.com') {
        const id = host === 'youtu.be'
            ? partes[0]
            : url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(partes[0]) ? partes[1] : null);
        return /^[\w-]{11}$/.test(id || '') ? { tipo: 'youtube', id, vertical: partes[0] === 'shorts' } : null;
    }

    const slugValido = slug => /^[\w-]{3,100}$/.test(slug || '');
    if (host === 'clips.twitch.tv') {
        const slug = partes[0] === 'embed' ? url.searchParams.get('clip') : partes[0];
        return slugValido(slug) ? { tipo: 'twitch-clip', id: slug, vertical: false } : null;
    }
    if (host === 'twitch.tv') {
        if (partes[1] === 'clip' && slugValido(partes[2])) return { tipo: 'twitch-clip', id: partes[2], vertical: false };
        if (partes[0] === 'videos' && /^\d+$/.test(partes[1] || '')) return { tipo: 'twitch-video', id: partes[1], vertical: false };
    }
    return null;
}

function lista(valor, grupo, permitidos) {
    if (!Array.isArray(valor)) falhar(`"${grupo}" precisa ser uma lista.`);
    const invalidos = valor.filter(v => !permitidos.includes(v));
    if (invalidos.length) falhar(`Opção inválida em ${grupo}: ${invalidos.join(', ')}`);
    return [...new Set(valor)];
}

function imagem(dataUrl, nome) {
    if (dataUrl == null || dataUrl === '') return null;
    const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m || !MIMES.includes(m[1])) falhar(`Imagem ${nome} inválida (use PNG, JPG, WEBP ou GIF).`);
    if (m[2].length * 0.75 > MAX_IMAGEM_BYTES) falhar(`Imagem ${nome} passa de 2 MB.`);
    return { mime: m[1], base64: m[2] };
}

// opcoes: { tags, plataforma, idioma } com os ids cadastrados no banco (lib/tags.js > opcoesPorGrupo)
export function validarVtuber(corpo, { opcoes }) {
    if (!corpo || typeof corpo !== 'object') falhar('Corpo da requisição inválido.');

    const id = String(corpo.id || '').trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(id)) {
        falhar('O identificador deve ter só letras minúsculas, números e hífens (até 40).');
    }

    const nome = String(corpo.nome || '').trim();
    if (!nome || nome.length > 60) falhar('Informe um nome com até 60 caracteres.');

    const cor = String(corpo.cor || '').trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(cor)) falhar('Cor inválida.');

    const texto = valor => String(valor || '').replace(/\r\n/g, '\n').trim();
    const bio = texto(corpo.bio);
    const bioEn = texto(corpo.bioEn);
    if (bio.length > 6000) falhar('A bio em português passa de 6000 caracteres.');
    if (bioEn.length > 6000) falhar('A bio em inglês passa de 6000 caracteres.');

    // Redes fixas + um link para cada plataforma cadastrada (ex.: TikTok)
    const redesPermitidas = new Set([...REDES, ...opcoes.plataforma]);
    const desconhecidas = Object.keys(corpo.redes ?? {}).filter(rede => !redesPermitidas.has(rede));
    if (desconhecidas.length) falhar(`Rede social desconhecida: ${desconhecidas.join(', ')}`);
    const redes = {};
    for (const rede of redesPermitidas) {
        const url = String(corpo.redes?.[rede] || '').trim();
        if (!url) continue;
        let parsed;
        try { parsed = new URL(url); } catch { falhar(`Link de ${rede} inválido.`); }
        if (parsed.protocol !== 'https:') falhar(`O link de ${rede} precisa começar com https://`);
        redes[rede] = parsed.href;
    }

    if (!Array.isArray(corpo.videos)) falhar('"videos" precisa ser uma lista.');
    if (corpo.videos.length > MAX_VIDEOS) falhar(`Máximo de ${MAX_VIDEOS} momentos do criador.`);
    const videos = corpo.videos.map((v, i) => {
        const video = identificarVideo(v?.url ?? v?.id);
        if (!video) falhar(`Momento ${i + 1}: link não reconhecido (use vídeo ou Shorts do YouTube, ou clipe/vídeo da Twitch).`);
        return video;
    });

    return {
        id, nome, cor, bio, bioEn, redes, videos,
        tags: lista(corpo.tags ?? [], 'tags', opcoes.tags),
        horario: lista(corpo.horario ?? [], 'horario', HORARIOS),
        plataforma: lista(corpo.plataforma ?? [], 'plataforma', opcoes.plataforma),
        idioma: lista(corpo.idioma ?? [], 'idioma', opcoes.idioma),
        imagens: {
            card: imagem(corpo.imagens?.card, 'do card'),
            perfil: imagem(corpo.imagens?.perfil, 'do perfil')
        }
    };
}
