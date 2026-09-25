/*
 * Dados das Vtubers: opções de filtro e acesso à API (os dados ficam no banco Neon).
 */

// Raiz do site, calculada a partir deste arquivo (js/vtubers-data.js), para os links
// funcionarem tanto no index.html (raiz) quanto nas páginas dentro de html/.
const RAIZ_SITE = new URL('../', document.currentScript.src);
const urlDoSite = caminho => new URL(caminho, RAIZ_SITE).href;

// Rótulos em português e inglês. As chaves precisam bater com OPCOES em lib/validar.js.
const FILTROS = {
    tags: {
        titulo: { pt: 'Conteúdo', en: 'Content' },
        // Reserva: a lista real vem do banco (/api/tags) e substitui estas opções ao carregar.
        opcoes: {
            'just-chatting': { pt: 'Just Chatting', en: 'Just Chatting' },
            'gameplay': { pt: 'Gameplay', en: 'Gameplay' },
            'react': { pt: 'React', en: 'React' },
            'asmr': { pt: 'ASMR', en: 'ASMR' },
            'musica': { pt: 'Música', en: 'Music' },
            'arte': { pt: 'Arte', en: 'Art' }
        }
    },
    horario: {
        titulo: { pt: 'Horário', en: 'Schedule' },
        opcoes: {
            'manha': { pt: 'Manhã', en: 'Morning' },
            'tarde': { pt: 'Tarde', en: 'Afternoon' },
            'noite': { pt: 'Noite', en: 'Evening' },
            'madrugada': { pt: 'Madrugada', en: 'Late night' },
            'diverso': { pt: 'Diverso', en: 'Varied' } // faz lives em muitos horários diferentes
        }
    },
    plataforma: {
        titulo: { pt: 'Plataforma', en: 'Platform' },
        opcoes: {
            'twitch': { pt: 'Twitch', en: 'Twitch' },
            'youtube': { pt: 'YouTube', en: 'YouTube' },
            'kick': { pt: 'Kick', en: 'Kick' }
        }
    },
    idioma: {
        titulo: { pt: 'Idioma', en: 'Language' },
        opcoes: {
            'portugues': { pt: 'Português', en: 'Portuguese' },
            'ingles': { pt: 'Inglês', en: 'English' }
        }
    }
};

// Idioma atual (definido por js/i18n.js nas páginas públicas; o painel admin fica em português).
const idiomaAtual = () => (typeof IDIOMA !== 'undefined' ? IDIOMA : 'pt');

const ICONES_PLATAFORMA = { twitch: 'bxl-twitch', youtube: 'bxl-youtube', kick: 'bx-play-circle' };

// Nome da opção no idioma atual, já escapado para uso em HTML (as tags vêm do banco).
function rotulo(grupo, valor) {
    return esc(FILTROS[grupo].opcoes[valor]?.[idiomaAtual()] ?? valor);
}

function tituloDoGrupo(grupo) {
    return FILTROS[grupo].titulo[idiomaAtual()];
}

// Bio no idioma escolhido. Sem versão em inglês, usa a em português (fallback = true).
function bioNoIdioma(vt) {
    const querIngles = idiomaAtual() === 'en';
    if (querIngles && vt.bioEn?.trim()) return { texto: vt.bioEn, fallback: false };
    return { texto: vt.bio, fallback: querIngles && Boolean(vt.bio?.trim()) };
}

// Escapa texto vindo do banco antes de colocar em HTML.
function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// Bio: parágrafos separados por linha em branco, **negrito** e ==destaque na cor da vtuber==.
function renderizarBio(texto) {
    return String(texto || '').split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${
        esc(p.trim())
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/==(.+?)==/g, '<strong class="hl">$1</strong>')
            .replace(/\n/g, '<br>')
    }</p>`).join('');
}

const urlPerfil = id => urlDoSite(`html/vtuber.html?id=${encodeURIComponent(id)}`);

// Troca as opções de tags pelas cadastradas no banco: [{ id, pt, en }]
function aplicarTags(lista) {
    FILTROS.tags.opcoes = Object.fromEntries(lista.map(tag => [tag.id, { pt: tag.pt, en: tag.en }]));
}

let tagsEmCache;

// Carrega as tags do banco; se falhar, mantém as opções de reserva.
function carregarTags() {
    tagsEmCache ??= fetch(urlDoSite('api/tags'))
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))))
        .then(aplicarTags)
        .catch(() => { tagsEmCache = undefined; });
    return tagsEmCache;
}

let listaEmCache;

async function carregarVtubers() {
    listaEmCache ??= Promise.all([
        fetch(urlDoSite('api/vtubers')).then(r => {
            if (!r.ok) throw new Error(`Erro ${r.status} ao carregar as Vtubers`);
            return r.json();
        }),
        carregarTags()
    ]).then(([lista]) => lista);
    return listaEmCache;
}

async function carregarVtuber(id) {
    const [r] = await Promise.all([
        fetch(urlDoSite(`api/vtubers?id=${encodeURIComponent(id)}`)),
        carregarTags()
    ]);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Erro ${r.status} ao carregar a Vtuber`);
    return r.json();
}

/* Card usado na lista e na home. Retorna um <a> pronto para inserir. */
function criarCardVtuber(vt) {
    const card = document.createElement('a');
    card.className = 'vt-card';
    card.href = urlPerfil(vt.id);
    card.style.setProperty('--accent', vt.cor);

    const plataformas = vt.plataforma
        .map(p => `<i class='bx ${ICONES_PLATAFORMA[p]}' title="${rotulo('plataforma', p)}"></i>`)
        .join('');
    const idiomas = vt.idioma.map(i => rotulo('idioma', i)).join(' · ');
    const tags = vt.tags.slice(0, 3).map(t => `<span class="chip">${rotulo('tags', t)}</span>`).join('');
    const extra = vt.tags.length > 3 ? `<span class="chip">+${vt.tags.length - 3}</span>` : '';
    const imagem = vt.img
        ? `<img src="${esc(urlDoSite(vt.img.replace(/^\//, '')))}" alt="${esc(vt.nome)}" loading="lazy" decoding="async">`
        : '';

    card.innerHTML = `
        <div class="vt-card-media">${imagem}</div>
        <div class="vt-card-body">
            <h3 class="vt-card-name">${esc(vt.nome)}</h3>
            <div class="vt-card-meta">
                <span>${plataformas}</span>
                <span><i class='bx bx-globe'></i>${idiomas}</span>
            </div>
            <div class="vt-card-tags">${tags}${extra}</div>
        </div>`;
    return card;
}

// Placeholders enquanto os dados carregam.
function cardsCarregando(quantidade) {
    return Array.from({ length: quantidade }, () => {
        const card = document.createElement('div');
        card.className = 'vt-card is-loading';
        card.innerHTML = '<div class="vt-card-media"></div><div class="vt-card-body"><span class="skeleton"></span><span class="skeleton short"></span></div>';
        return card;
    });
}
