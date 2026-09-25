/*
 * Lista de Vtubers: busca por nome, filtros combináveis, ordenação e paginação.
 * Cada página mostra 6 linhas cheias (a quantidade de colunas depende da largura da tela)
 * e só os cards da página atual são criados no DOM, então só as imagens dela são carregadas.
 */
const LINHAS_POR_PAGINA = 6;
const GRUPOS = Object.keys(FILTROS);

const grid = document.getElementById('lista');
const busca = document.getElementById('busca');
const ordem = document.getElementById('ordem');
const gruposEl = document.getElementById('filter-groups');
const finder = document.querySelector('.finder');
const filtrosToggle = document.getElementById('filters-toggle');
const filtrosCount = document.getElementById('filters-count');
const resultado = document.getElementById('resultado');
const limpar = document.getElementById('limpar');
const vazio = document.getElementById('vazio');
const paginacao = document.getElementById('paginacao');

const estado = {
    busca: '',
    ordem: 'recentes',
    filtros: Object.fromEntries(GRUPOS.map(g => [g, new Set()])),
    pagina: 1
};

const normalizar = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ---------- Montagem dos filtros (depois de carregar as tags do banco) ----------
function montarFiltros() {
    gruposEl.innerHTML = GRUPOS.map(grupo => `
    <fieldset class="filter-group">
        <legend>${tituloDoGrupo(grupo)}</legend>
        <div class="filter-options">
            ${Object.keys(FILTROS[grupo].opcoes).map(valor => `
                <label class="filter-chip">
                    <input type="checkbox" name="${grupo}" value="${valor}">
                    <span>${rotulo(grupo, valor)}</span>
                </label>`).join('')}
        </div>
    </fieldset>`).join('');
}

// ---------- Estado <-> URL (permite compartilhar e voltar com o navegador) ----------
function lerUrl() {
    const params = new URLSearchParams(location.search);
    estado.busca = params.get('q') || '';
    estado.ordem = params.get('ordem') === 'az' ? 'az' : 'recentes';
    GRUPOS.forEach(g => {
        estado.filtros[g] = new Set((params.get(g) || '').split(',').filter(v => v in FILTROS[g].opcoes));
    });
    estado.pagina = Math.max(1, parseInt(params.get('pagina'), 10) || 1);

    busca.value = estado.busca;
    ordem.value = estado.ordem;
    gruposEl.querySelectorAll('input').forEach(input => {
        input.checked = estado.filtros[input.name].has(input.value);
    });
}

function salvarUrl(novaEntrada) {
    const params = new URLSearchParams();
    if (estado.busca) params.set('q', estado.busca);
    if (estado.ordem !== 'recentes') params.set('ordem', estado.ordem);
    GRUPOS.forEach(g => {
        if (estado.filtros[g].size) params.set(g, [...estado.filtros[g]].join(','));
    });
    if (estado.pagina > 1) params.set('pagina', estado.pagina);

    const url = params.toString() ? `?${params}` : location.pathname;
    history[novaEntrada ? 'pushState' : 'replaceState'](null, '', url);
}

// ---------- Filtragem ----------
let VTUBERS = [];
let carregado = false;

function filtrar() {
    const termo = normalizar(estado.busca);
    // Dentro de um mesmo grupo basta bater uma opção (OU); entre grupos todas precisam bater (E).
    const lista = VTUBERS.filter(vt =>
        (!termo || normalizar(vt.nome).includes(termo) || normalizar(vt.id).includes(termo)) &&
        GRUPOS.every(g => {
            if (estado.filtros[g].size === 0) return true;
            // Horário: calculado a partir da agenda no fuso escolhido (quando a vtuber tem agenda).
            const valores = g === 'horario' ? periodosDaVtuber(vt) : vt[g];
            // Quem tem horário "diverso" aparece em qualquer filtro de horário.
            return valores.some(v => estado.filtros[g].has(v)) || (g === 'horario' && valores.includes('diverso'));
        })
    );
    if (estado.ordem === 'az') {
        lista.sort((a, b) => a.nome.localeCompare(b.nome, document.documentElement.lang));
    }
    return lista;
}

function colunasDoGrid() {
    const colunas = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
    return Math.max(1, colunas);
}

function porPagina() {
    return colunasDoGrid() * LINHAS_POR_PAGINA;
}

// ---------- Renderização ----------
function render() {
    if (!carregado) return;
    const lista = filtrar();
    const tamanho = porPagina();
    const totalPaginas = Math.max(1, Math.ceil(lista.length / tamanho));
    estado.pagina = Math.min(estado.pagina, totalPaginas);

    const inicio = (estado.pagina - 1) * tamanho;
    const pagina = lista.slice(inicio, inicio + tamanho);
    grid.replaceChildren(...pagina.map(criarCardVtuber));

    const ativos = GRUPOS.reduce((soma, g) => soma + estado.filtros[g].size, 0);
    filtrosCount.textContent = ativos || '';
    limpar.hidden = !ativos && !estado.busca;
    vazio.hidden = lista.length > 0;

    if (lista.length === 0) {
        resultado.textContent = t('lista.nenhuma');
    } else if (totalPaginas > 1) {
        resultado.innerHTML = t('lista.mostrando', { inicio: inicio + 1, fim: inicio + pagina.length, total: lista.length });
    } else {
        resultado.innerHTML = lista.length === 1 ? t('lista.encontrada') : t('lista.encontradas', { n: lista.length });
    }

    renderPaginacao(totalPaginas);
}

function numerosDePagina(total, atual) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const paginas = new Set([1, total, atual - 1, atual, atual + 1]);
    const ordenadas = [...paginas].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const resultado = [];
    ordenadas.forEach((p, i) => {
        if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push('…');
        resultado.push(p);
    });
    return resultado;
}

function renderPaginacao(total) {
    paginacao.hidden = total <= 1;
    if (total <= 1) {
        paginacao.innerHTML = '';
        return;
    }
    const atual = estado.pagina;
    paginacao.innerHTML = `
        <button type="button" data-pagina="${atual - 1}" ${atual === 1 ? 'disabled' : ''} aria-label="${t('lista.anterior')}">
            <i class='bx bx-chevron-left'></i>
        </button>
        ${numerosDePagina(total, atual).map(p => p === '…'
            ? `<span class="gap">…</span>`
            : `<button type="button" data-pagina="${p}" ${p === atual ? 'aria-current="page"' : ''}>${p}</button>`
        ).join('')}
        <button type="button" data-pagina="${atual + 1}" ${atual === total ? 'disabled' : ''} aria-label="${t('lista.proxima')}">
            <i class='bx bx-chevron-right'></i>
        </button>`;
}

// ---------- Eventos ----------
function aoMudarFiltro() {
    estado.pagina = 1;
    salvarUrl(false);
    render();
}

busca.addEventListener('input', () => {
    estado.busca = busca.value;
    aoMudarFiltro();
});

ordem.addEventListener('change', () => {
    estado.ordem = ordem.value;
    aoMudarFiltro();
});

gruposEl.addEventListener('change', event => {
    const input = event.target;
    estado.filtros[input.name][input.checked ? 'add' : 'delete'](input.value);
    aoMudarFiltro();
});

function limparTudo() {
    estado.busca = '';
    busca.value = '';
    GRUPOS.forEach(g => estado.filtros[g].clear());
    gruposEl.querySelectorAll('input').forEach(input => { input.checked = false; });
    aoMudarFiltro();
}

limpar.addEventListener('click', limparTudo);
document.getElementById('vazio-limpar').addEventListener('click', limparTudo);

filtrosToggle.addEventListener('click', () => {
    const aberto = finder.classList.toggle('filters-open');
    filtrosToggle.setAttribute('aria-expanded', aberto);
});

paginacao.addEventListener('click', event => {
    const botao = event.target.closest('button[data-pagina]');
    if (!botao || botao.disabled) return;
    estado.pagina = Number(botao.dataset.pagina);
    salvarUrl(true);
    render();
    document.getElementById('resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

window.addEventListener('popstate', () => {
    lerUrl();
    render();
});

// Quando a quantidade de colunas muda (ex.: girar o celular), mantém visível o primeiro card da página atual.
let colunasAtuais = 0;
let agendado = false;
window.addEventListener('resize', () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
        agendado = false;
        const colunas = colunasDoGrid();
        if (colunas === colunasAtuais) return;
        const primeiro = (estado.pagina - 1) * colunasAtuais * LINHAS_POR_PAGINA;
        colunasAtuais = colunas;
        estado.pagina = Math.floor(primeiro / (colunas * LINHAS_POR_PAGINA)) + 1;
        salvarUrl(false);
        render();
    });
});

// Fuso horário do visitante (muda o período das vtubers que têm agenda)
const fusoEl = document.getElementById('fuso');
fusoEl.innerHTML = opcoesDeFuso(fusoAtual());
fusoEl.addEventListener('change', () => {
    escolherFuso(fusoEl.value);
    estado.pagina = 1;
    salvarUrl(false);
    render();
});

lerUrl();
colunasAtuais = colunasDoGrid();
grid.replaceChildren(...cardsCarregando(colunasAtuais * 2));
resultado.textContent = t('lista.carregando');

carregarVtubers()
    .then(lista => {
        VTUBERS = lista;
        carregado = true;
        montarFiltros();
        lerUrl(); // de novo, agora que as tags existem (marca os filtros que vieram na URL)
        render();
    })
    .catch(() => {
        grid.replaceChildren();
        resultado.textContent = t('lista.erro');
    });
