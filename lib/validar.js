// Validação dos dados enviados pelo painel admin.
// As opções precisam bater com FILTROS em js/vtubers-data.js; as tags de conteúdo vêm do banco (lib/tags.js).
const OPCOES = {
    horario: ['manha', 'tarde', 'noite', 'madrugada', 'diverso'],
    plataforma: ['twitch', 'youtube', 'kick'],
    idioma: ['portugues', 'ingles']
};
const REDES = ['twitch', 'youtube', 'x', 'kick'];
const MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGEM_BYTES = 2 * 1024 * 1024;
const MAX_VIDEOS = 10;

export class ErroValidacao extends Error {}

const falhar = msg => { throw new ErroValidacao(msg); };

// Aceita links do YouTube (watch, youtu.be, shorts, embed, live) ou o próprio ID.
export function idDoYoutube(entrada) {
    const texto = String(entrada || '').trim();
    if (/^[\w-]{11}$/.test(texto)) return { id: texto, shorts: false };
    let url;
    try { url = new URL(texto); } catch { return null; }
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) return null;
    const id = url.hostname.endsWith('youtu.be')
        ? url.pathname.slice(1)
        : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
    return /^[\w-]{11}$/.test(id || '') ? { id, shorts: url.pathname.startsWith('/shorts/') } : null;
}

function lista(valor, grupo, permitidos = OPCOES[grupo]) {
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

// tags: ids das tags de conteúdo cadastradas no banco
export function validarVtuber(corpo, { tags: tagsValidas }) {
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

    const redes = {};
    for (const rede of REDES) {
        const url = String(corpo.redes?.[rede] || '').trim();
        if (!url) continue;
        let parsed;
        try { parsed = new URL(url); } catch { falhar(`Link de ${rede} inválido.`); }
        if (parsed.protocol !== 'https:') falhar(`O link de ${rede} precisa começar com https://`);
        redes[rede] = parsed.href;
    }

    if (!Array.isArray(corpo.videos)) falhar('"videos" precisa ser uma lista.');
    if (corpo.videos.length > MAX_VIDEOS) falhar(`Máximo de ${MAX_VIDEOS} vídeos.`);
    const videos = corpo.videos.map((v, i) => {
        const yt = idDoYoutube(v?.url ?? v?.id);
        if (!yt) falhar(`Vídeo ${i + 1}: link do YouTube inválido.`);
        return { id: yt.id, vertical: Boolean(v.vertical ?? yt.shorts) };
    });

    return {
        id, nome, cor, bio, bioEn, redes, videos,
        tags: lista(corpo.tags ?? [], 'tags', tagsValidas),
        horario: lista(corpo.horario ?? [], 'horario'),
        plataforma: lista(corpo.plataforma ?? [], 'plataforma'),
        idioma: lista(corpo.idioma ?? [], 'idioma'),
        imagens: {
            card: imagem(corpo.imagens?.card, 'do card'),
            perfil: imagem(corpo.imagens?.perfil, 'do perfil')
        }
    };
}
