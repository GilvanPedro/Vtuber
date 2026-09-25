/*
 * Dados das Vtubers: opções de filtro e acesso à API (os dados ficam no banco Neon).
 * As chaves de FILTROS precisam bater com OPCOES em lib/validar.js.
 */

// Raiz do site, calculada a partir deste arquivo (js/vtubers-data.js), para os links
// funcionarem tanto no index.html (raiz) quanto nas páginas dentro de html/.
const RAIZ_SITE = new URL('../', document.currentScript.src);
const urlDoSite = caminho => new URL(caminho, RAIZ_SITE).href;

const FILTROS = {
    tags: {
        titulo: 'Conteúdo',
        opcoes: {
            'just-chatting': 'Just Chatting',
            'gameplay': 'Gameplay',
            'react': 'React',
            'asmr': 'ASMR',
            'musica': 'Música',
            'arte': 'Arte'
        }
    },
    horario: {
        titulo: 'Horário',
        opcoes: {
            'manha': 'Manhã',
            'tarde': 'Tarde',
            'noite': 'Noite',
            'madrugada': 'Madrugada'
        }
    },
    plataforma: {
        titulo: 'Plataforma',
        opcoes: {
            'twitch': 'Twitch',
            'youtube': 'YouTube',
            'kick': 'Kick'
        }
    },
    idioma: {
        titulo: 'Idioma',
        opcoes: {
            'portugues': 'Português',
            'ingles': 'Inglês'
        }
    }
};

const ICONES_PLATAFORMA = { twitch: 'bxl-twitch', youtube: 'bxl-youtube', kick: 'bx-play-circle' };

function rotulo(grupo, valor) {
    return FILTROS[grupo].opcoes[valor] || valor;
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

let listaEmCache;

async function carregarVtubers() {
    listaEmCache ??= fetch(urlDoSite('api/vtubers')).then(r => {
        if (!r.ok) throw new Error(`Erro ${r.status} ao carregar as Vtubers`);
        return r.json();
    });
    return listaEmCache;
}

async function carregarVtuber(id) {
    const r = await fetch(urlDoSite(`api/vtubers?id=${encodeURIComponent(id)}`));
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
