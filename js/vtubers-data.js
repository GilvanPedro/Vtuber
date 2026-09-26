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
        // Reserva (tags, plataforma e idioma): a lista real vem do banco (/api/tags) e substitui estas opções.
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

// Ícones (Boxicons) das plataformas conhecidas; plataformas novas usam um ícone genérico.
const ICONES_PLATAFORMA = {
    twitch: 'bxl-twitch', youtube: 'bxl-youtube', kick: 'bx-play-circle', tiktok: 'bxl-tiktok',
    instagram: 'bxl-instagram', facebook: 'bxl-facebook-circle', discord: 'bxl-discord-alt'
};
const iconePlataforma = id => ICONES_PLATAFORMA[id] ?? 'bx-broadcast';

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
// Troca as opções de cada grupo (tags, plataforma, idioma) pelas cadastradas no banco: [{ grupo, id, pt, en }]
function aplicarTags(lista) {
    for (const grupo of ['tags', 'plataforma', 'idioma']) {
        const doGrupo = lista.filter(tag => (tag.grupo ?? 'tags') === grupo);
        if (doGrupo.length) FILTROS[grupo].opcoes = Object.fromEntries(doGrupo.map(tag => [tag.id, { pt: tag.pt, en: tag.en }]));
    }
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

// Seguidores na Twitch + inscritos no YouTube. Quem não tem conta (ou número) em uma plataforma conta como 0 nela.
function seguidoresTotais(vt) {
    return (vt.seguidoresTwitch ?? 0) + (vt.inscritosYoutube ?? 0);
}

// Se há algum número conhecido (para decidir se o card mostra o total)
const temSeguidores = vt => typeof vt.seguidoresTwitch === 'number' || typeof vt.inscritosYoutube === 'number';

// Dica do card: "12.345 seguidores na Twitch + 6.789 inscritos no YouTube"
function tituloSeguidores(vt) {
    const partes = [];
    if (typeof vt.seguidoresTwitch === 'number') partes.push(`${vt.seguidoresTwitch.toLocaleString(document.documentElement.lang)} ${typeof t === 'function' ? t('stats.seguidores') : 'seguidores na Twitch'}`);
    if (typeof vt.inscritosYoutube === 'number') partes.push(`${vt.inscritosYoutube.toLocaleString(document.documentElement.lang)} ${typeof t === 'function' ? t('stats.inscritos') : 'inscritos no YouTube'}`);
    return partes.join(' + ');
}

const formatarCompacto = valor => new Intl.NumberFormat(document.documentElement.lang || 'pt-BR',
    { notation: 'compact', maximumFractionDigits: 1 }).format(valor);

/* Card usado na lista e na home. Retorna um <a> pronto para inserir. */
function criarCardVtuber(vt) {
    const card = document.createElement('a');
    card.className = 'vt-card';
    card.href = urlPerfil(vt.id);
    card.style.setProperty('--accent', vt.cor);

    const plataformas = vt.plataforma
        .map(p => `<i class='bx ${iconePlataforma(p)}' title="${rotulo('plataforma', p)}"></i>`)
        .join('');
    const idiomas = vt.idioma.map(i => rotulo('idioma', i)).join(' · ');
    const total = seguidoresTotais(vt);
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
                ${!temSeguidores(vt) ? '' : `<span class="vt-card-seguidores" title="${esc(tituloSeguidores(vt))}"><i class='bx bx-group'></i>${formatarCompacto(total)}</span>`}
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

// ---------- Fusos horários e agenda de lives ----------
// FUSOS, fusoAtual() e escolherFuso() ficam em js/fusos.js (carregado antes deste arquivo).
const PERIODOS = ['manha', 'tarde', 'noite', 'madrugada', 'diverso'];

// Data/hora "de parede" de um instante num fuso: { ano, mes, dia, hora, minuto, diaDaSemana }
function partesNoFuso(ms, fuso) {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: fuso, hourCycle: 'h23', weekday: 'short',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(ms).map(p => [p.type, p.value]));
    return {
        ano: +partes.year, mes: +partes.month - 1, dia: +partes.day,
        hora: +partes.hour % 24, minuto: +partes.minute,
        diaDaSemana: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday)
    };
}

// Converte uma data/hora local de um fuso para um instante (considera horário de verão).
function instanteNoFuso(ano, mes, dia, hora, minuto, fuso) {
    const comoUtc = Date.UTC(ano, mes, dia, hora, minuto);
    const diferenca = ms => {
        const p = partesNoFuso(ms, fuso);
        return Date.UTC(p.ano, p.mes, p.dia, p.hora, p.minuto) - Math.floor(ms / 60000) * 60000;
    };
    const aproximado = comoUtc - diferenca(comoUtc);
    return comoUtc - diferenca(aproximado);
}

// Próxima ocorrência (a partir desta semana) de um dia da semana + hora num fuso.
function proximaLive(diaDaSemana, horario, fuso) {
    const [hora, minuto] = horario.split(':').map(Number);
    const hoje = partesNoFuso(Date.now(), fuso);
    const avanco = (diaDaSemana - hoje.diaDaSemana + 7) % 7;
    return instanteNoFuso(hoje.ano, hoje.mes, hoje.dia + avanco, hora, minuto, fuso);
}

const doisDigitos = n => String(n).padStart(2, '0');
const minutosDe = horario => Number(horario.slice(0, 2)) * 60 + Number(horario.slice(3, 5));

// Agenda da vtuber convertida para outro fuso, agrupando dias com o mesmo horário:
// [{ dias: [1, 3, 5], inicio: '20:00', fim: '23:00' | null }] (a live pode mudar de dia na conversão)
function agendaNoFuso(vt, destino = fusoAtual()) {
    const origem = vt.fuso || FUSOS[0].id;
    const grupos = new Map();
    for (const item of vt.agenda ?? []) {
        for (const dia of item.dias) {
            const inicio = proximaLive(dia, item.inicio, origem);
            const local = partesNoFuso(inicio, destino);
            let fim = null;
            if (item.fim) {
                let duracao = minutosDe(item.fim) - minutosDe(item.inicio);
                if (duracao <= 0) duracao += 24 * 60; // termina depois da meia-noite
                const final = partesNoFuso(inicio + duracao * 60000, destino);
                fim = `${doisDigitos(final.hora)}:${doisDigitos(final.minuto)}`;
            }
            const horaInicio = `${doisDigitos(local.hora)}:${doisDigitos(local.minuto)}`;
            const chave = `${horaInicio}|${fim ?? ''}`;
            if (!grupos.has(chave)) grupos.set(chave, { dias: new Set(), inicio: horaInicio, fim });
            grupos.get(chave).dias.add(local.diaDaSemana);
        }
    }
    const segundaPrimeiro = dia => (dia + 6) % 7;
    return [...grupos.values()]
        .map(g => ({ ...g, dias: [...g.dias].sort((a, b) => segundaPrimeiro(a) - segundaPrimeiro(b)) }))
        .sort((a, b) => segundaPrimeiro(a.dias[0]) - segundaPrimeiro(b.dias[0]) || a.inicio.localeCompare(b.inicio));
}

const periodoDaHora = horario => {
    const hora = Number(horario.slice(0, 2));
    return hora < 6 ? 'madrugada' : hora < 12 ? 'manha' : hora < 18 ? 'tarde' : 'noite';
};

// Faixa de cada período, em horas do dia
const FAIXAS = { madrugada: [0, 6], manha: [6, 12], tarde: [12, 18], noite: [18, 24] };
// Um período de destino só entra se pegar pelo menos 2h da faixa convertida
const MINIMO_SOBREPOSICAO = 120;

// Diferença, em minutos, entre dois fusos agora (considera o horário de verão do momento)
function diferencaEntreFusos(origem, destino, ms = Date.now()) {
    const minutosLocais = fuso => {
        const p = partesNoFuso(ms, fuso);
        return Date.UTC(p.ano, p.mes, p.dia, p.hora, p.minuto) / 60000;
    };
    return minutosLocais(destino) - minutosLocais(origem);
}

// Converte períodos marcados num fuso para os períodos equivalentes em outro.
// Ex.: "Noite" em Brasília (18h–24h) vira "Noite" + "Madrugada" na Europa no inverno (22h–04h).
function converterPeriodos(periodos, origem, destino) {
    const diferenca = diferencaEntreFusos(origem, destino);
    const convertidos = new Set();
    for (const periodo of periodos) {
        if (!FAIXAS[periodo]) continue;
        const inicio = FAIXAS[periodo][0] * 60 + diferenca;
        const fim = FAIXAS[periodo][1] * 60 + diferenca;
        for (const [destinoPeriodo, [a, b]] of Object.entries(FAIXAS)) {
            // A faixa pode atravessar a meia-noite: compara também com o dia anterior e o seguinte
            const sobreposicao = [-1440, 0, 1440].reduce((total, desloc) =>
                total + Math.max(0, Math.min(fim, b * 60 + desloc) - Math.max(inicio, a * 60 + desloc)), 0);
            if (sobreposicao >= MINIMO_SOBREPOSICAO) convertidos.add(destinoPeriodo);
        }
    }
    return convertidos;
}

// Períodos marcados à mão, por fuso: o "horario" vale para o fuso da vtuber; "horarioFusos" guarda os outros.
function periodosManuais(vt) {
    const manuais = {};
    for (const [fuso, periodos] of Object.entries(vt.horarioFusos ?? {})) {
        if (periodos?.length) manuais[fuso] = periodos;
    }
    const base = (vt.horario ?? []).filter(p => p !== 'diverso');
    if (base.length) manuais[vt.fuso || FUSOS[0].id] = base;
    return manuais;
}

// Períodos (manhã, tarde...) da vtuber num fuso:
// 1. com agenda: calculados a partir dos horários das lives;
// 2. se foram marcados à mão para esse fuso: esses;
// 3. senão: convertidos automaticamente de um fuso marcado à mão (de preferência o da própria vtuber).
// "Diverso" é sempre o marcado no painel e vale para todos os fusos.
function periodosDaVtuber(vt, destino = fusoAtual()) {
    let periodos;
    if (vt.agenda?.length) {
        periodos = new Set(agendaNoFuso(vt, destino).map(g => periodoDaHora(g.inicio)));
    } else {
        const manuais = periodosManuais(vt);
        const origem = [vt.fuso, ...FUSOS.map(f => f.id)].find(fuso => manuais[fuso]);
        periodos = manuais[destino]
            ? new Set(manuais[destino])
            : origem ? converterPeriodos(manuais[origem], origem, destino) : new Set();
    }
    if (vt.horario?.includes('diverso')) periodos.add('diverso');
    return PERIODOS.filter(p => periodos.has(p));
}

// Textos da agenda no idioma atual: "Seg, Qua, Sex" e "20:00 – 23:00" (ou "8:00 PM – 11:00 PM" em inglês)
function nomeDoDia(dia) {
    const nome = new Intl.DateTimeFormat(document.documentElement.lang || 'pt-BR', { weekday: 'short', timeZone: 'UTC' })
        .format(Date.UTC(2024, 0, 7 + dia)) // 7/jan/2024 foi um domingo
        .replace('.', '');
    return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function formatarHora(horario) {
    const idioma = document.documentElement.lang || 'pt-BR';
    // Português: 00:00–23:59; inglês: 12h (8:00 PM)
    return new Intl.DateTimeFormat(idioma, { hour: idioma.startsWith('pt') ? '2-digit' : 'numeric', minute: '2-digit', timeZone: 'UTC' })
        .format(Date.UTC(2024, 0, 1, Number(horario.slice(0, 2)), Number(horario.slice(3, 5))));
}
