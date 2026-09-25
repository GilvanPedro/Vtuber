/*
 * Painel admin: login, busca, criar, editar e excluir Vtubers.
 * Fala com /api/login, /api/logout, /api/sessao e /api/admin/vtubers.
 *
 * Desempenho: a lista é montada uma vez (a busca só esconde itens), usa miniaturas pequenas,
 * e os detalhes de cada Vtuber ficam em cache e são pré-carregados ao passar o mouse.
 */
const $ = id => document.getElementById(id);
const api = caminho => urlDoSite(`api/${caminho}`);
const imagemUrl = caminho => (caminho ? urlDoSite(caminho.replace(/^\//, '')) : '');

const telaLogin = $('tela-login');
const telaPainel = $('tela-painel');
const editor = $('editor');
const listaEl = $('lista-admin');
const buscaEl = $('busca-admin');
const videosEl = $('videos');
const modal = $('modal-excluir');

const TAMANHO_MAXIMO = { card: 1200, perfil: 1600 }; // o servidor gera as versões finais em WEBP
const REDES = ['twitch', 'youtube', 'x', 'kick', 'instagram'];

let vtubers = [];            // lista resumida (sem bio/redes/vídeos)
const detalhes = new Map();  // id -> Promise com os dados completos
let atual = null;            // id da vtuber em edição (null = nova)
let pedidoAtual = 0;         // descarta respostas de cliques anteriores
let imagensNovas = {};       // { card?: dataUrl, perfil?: dataUrl }
let idEditadoManualmente = false;
let alterado = false;

// ---------- Utilidades ----------
async function chamar(caminho, opcoes = {}) {
    const resposta = await fetch(api(caminho), {
        ...opcoes,
        headers: opcoes.body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'same-origin'
    });
    const dados = await resposta.json().catch(() => ({}));
    if (resposta.status === 401 && caminho !== 'login') {
        mostrarLogin();
        throw new Error('Sua sessão expirou. Entre de novo.');
    }
    if (!resposta.ok) throw new Error(dados.erro || `Erro ${resposta.status}`);
    return dados;
}

let timerToast;
function toast(mensagem, tipo = 'ok') {
    const el = $('toast');
    el.textContent = mensagem;
    el.className = `toast show ${tipo}`;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => { el.className = 'toast'; }, 3500);
}

const slug = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const normalizar = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Mesma regra de lib/validar.js (identificarVideo): reconhece o link e devolve { tipo, id, vertical } ou null.
function identificarVideo(entrada) {
    const texto = String(entrada || '').trim();
    if (/^[\w-]{11}$/.test(texto)) return { tipo: 'youtube', id: texto, vertical: false };

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

// Link editável a partir do que está salvo (dados antigos não têm "tipo": são do YouTube).
function linkDoVideo({ tipo = 'youtube', id, vertical }) {
    if (tipo === 'twitch-clip') return `https://clips.twitch.tv/${id}`;
    if (tipo === 'twitch-video') return `https://www.twitch.tv/videos/${id}`;
    return vertical ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
}

function descricaoDoVideo(video) {
    if (!video) return 'Link não reconhecido';
    if (video.tipo === 'twitch-clip') return 'Twitch · Clipe';
    if (video.tipo === 'twitch-video') return 'Twitch · Vídeo';
    return video.vertical ? 'YouTube · Shorts' : 'YouTube · Vídeo';
}

// ---------- Login ----------
function mostrarLogin() {
    telaPainel.hidden = true;
    $('sair').hidden = true;
    telaLogin.hidden = false;
    $('senha').focus();
}

async function mostrarPainel() {
    telaLogin.hidden = true;
    telaPainel.hidden = false;
    $('sair').hidden = false;
    await Promise.all([recarregarLista(), carregarTagsDoPainel()]);
}

$('form-login').addEventListener('submit', async event => {
    event.preventDefault();
    $('erro-login').textContent = '';
    const botao = event.submitter;
    botao.disabled = true;
    try {
        await chamar('login', { method: 'POST', body: JSON.stringify({ senha: $('senha').value }) });
        $('senha').value = '';
        await mostrarPainel();
    } catch (e) {
        $('erro-login').textContent = e.message;
    } finally {
        botao.disabled = false;
    }
});

$('sair').addEventListener('click', async () => {
    if (alterado && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    await chamar('logout', { method: 'POST' }).catch(() => {});
    alterado = false;
    detalhes.clear();
    fecharEditor();
    mostrarLogin();
});

// ---------- Lista + busca ----------
async function recarregarLista() {
    listaEl.innerHTML = '<li class="admin-empty">Carregando...</li>';
    try {
        vtubers = await chamar('admin/vtubers');
        montarLista();
    } catch (e) {
        listaEl.innerHTML = `<li class="admin-empty admin-error">${esc(e.message)}</li>`;
        $('contagem').textContent = '';
    }
}

function itemDaLista(vt) {
    const li = document.createElement('li');
    li.dataset.busca = normalizar(`${vt.nome} ${vt.id}`);
    li.innerHTML = `
        <button type="button" data-id="${esc(vt.id)}" style="--accent:${esc(vt.cor)}">
            <span class="admin-thumb">${vt.imgMini
                ? `<img src="${esc(imagemUrl(vt.imgMini))}" alt="" loading="lazy" decoding="async" width="44" height="44">`
                : ''}</span>
            <span class="admin-item-text">
                <strong>${esc(vt.nome)}</strong>
                <small>${esc(vt.id)}</small>
            </span>
        </button>`;
    return li;
}

// Monta a lista inteira (só quando os dados mudam).
function montarLista() {
    listaEl.replaceChildren(...vtubers.map(itemDaLista));
    const vazio = document.createElement('li');
    vazio.className = 'admin-empty';
    vazio.id = 'lista-vazia';
    vazio.textContent = 'Nenhuma Vtuber encontrada.';
    listaEl.appendChild(vazio);
    filtrarLista();
    marcarSelecionada();
}

// Busca: só mostra/esconde os itens já existentes.
function filtrarLista() {
    const termo = normalizar(buscaEl.value.trim());
    let visiveis = 0;
    for (const li of listaEl.querySelectorAll('li[data-busca]')) {
        li.hidden = Boolean(termo) && !li.dataset.busca.includes(termo);
        if (!li.hidden) visiveis++;
    }
    $('lista-vazia').hidden = visiveis > 0;
    $('contagem').textContent = termo
        ? `${visiveis} de ${vtubers.length} Vtubers`
        : `${vtubers.length} Vtubers cadastradas`;
}

function marcarSelecionada() {
    listaEl.querySelectorAll('button[data-id]').forEach(botao => {
        if (botao.dataset.id === atual) botao.setAttribute('aria-current', 'true');
        else botao.removeAttribute('aria-current');
    });
}

let timerBusca;
buscaEl.addEventListener('input', () => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(filtrarLista, 80);
});

listaEl.addEventListener('click', event => {
    const botao = event.target.closest('button[data-id]');
    if (botao) abrirEditor(botao.dataset.id);
});

// Pré-carrega os detalhes quando o mouse/foco para sobre um item.
let timerPrefetch;
function prefetch(event) {
    const botao = event.target.closest?.('button[data-id]');
    clearTimeout(timerPrefetch);
    if (botao) timerPrefetch = setTimeout(() => buscarDetalhes(botao.dataset.id).catch(() => {}), 120);
}
listaEl.addEventListener('pointerover', prefetch);
listaEl.addEventListener('focusin', prefetch);

$('nova').addEventListener('click', () => abrirEditor(null));

function buscarDetalhes(id) {
    if (!detalhes.has(id)) {
        const pedido = chamar(`admin/vtubers?id=${encodeURIComponent(id)}`);
        detalhes.set(id, pedido);
        pedido.catch(() => detalhes.delete(id));
    }
    return detalhes.get(id);
}

// ---------- Editor ----------
// Categorias (chips). Tags de conteúdo, plataformas e idiomas vêm do banco e podem ser cadastrados aqui.
const CADASTRAVEIS = {
    tags: { botao: 'Nova tag', criada: 'Tag "{nome}" criada!', jaExiste: 'Já existe a tag', exPt: 'Ex.: Culinária', exEn: 'E.g.: Cooking' },
    plataforma: { botao: 'Nova plataforma', criada: 'Plataforma "{nome}" criada!', jaExiste: 'Já existe a plataforma', exPt: 'Ex.: TikTok', exEn: 'E.g.: TikTok' },
    idioma: { botao: 'Novo idioma', criada: 'Idioma "{nome}" criado!', jaExiste: 'Já existe o idioma', exPt: 'Ex.: Espanhol', exEn: 'E.g.: Spanish' }
};

function formularioNovaOpcao(grupo) {
    const config = CADASTRAVEIS[grupo];
    return `
        <div class="nova-tag" data-grupo="${grupo}" hidden>
            <label class="field"><span>Nome em português</span><input type="text" class="opcao-pt" maxlength="30" placeholder="${config.exPt}" autocomplete="off"></label>
            <label class="field"><span>Name in English</span><input type="text" class="opcao-en" maxlength="30" placeholder="${config.exEn}" autocomplete="off"></label>
            <div class="nova-tag-acoes">
                <button type="button" class="btn btn-primary btn-sm" data-acao="salvar" disabled><i class='bx bx-check'></i>Adicionar</button>
                <button type="button" class="btn btn-ghost btn-sm" data-acao="cancelar">Cancelar</button>
            </div>
            <p class="form-error" role="alert"></p>
        </div>`;
}

function montarCategorias() {
    const marcados = new Set([...editor.querySelectorAll('#categorias input:checked')].map(i => `${i.name}:${i.value}`));
    $('categorias').innerHTML = Object.keys(FILTROS).map(grupo => `
        <fieldset class="filter-group">
            <legend>${tituloDoGrupo(grupo)}</legend>
            <div class="filter-options">
                ${Object.keys(FILTROS[grupo].opcoes).map(valor => `
                    <label class="filter-chip">
                        <input type="checkbox" name="${grupo}" value="${esc(valor)}" ${marcados.has(`${grupo}:${valor}`) ? 'checked' : ''}>
                        <span>${rotulo(grupo, valor)}</span>
                    </label>`).join('')}
                ${CADASTRAVEIS[grupo] ? `<button type="button" class="chip-add" data-acao="abrir" data-grupo="${grupo}"><i class='bx bx-plus'></i>${CADASTRAVEIS[grupo].botao}</button>` : ''}
            </div>
            ${CADASTRAVEIS[grupo] ? formularioNovaOpcao(grupo) : ''}
        </fieldset>`).join('');
}

async function carregarTagsDoPainel() {
    try {
        aplicarTags(await chamar('admin/tags'));
    } catch (e) {
        toast(`Não foi possível carregar as opções: ${e.message}`, 'erro');
    }
    montarCategorias();
}

montarCategorias();

// ---------- Links das plataformas novas (ex.: TikTok) ----------
// Cada plataforma marcada que não está nas redes fixas ganha um campo de link em "Redes sociais".
function linksDasRedesExtras() {
    return Object.fromEntries([...$('redes-extras').querySelectorAll('input[data-rede]')]
        .map(input => [input.dataset.rede, input.value.trim()]));
}

function montarRedesExtras(valores = linksDasRedesExtras()) {
    const marcadas = [...editor.querySelectorAll('#categorias input[name="plataforma"]:checked')]
        .map(input => input.value)
        .filter(id => !REDES.includes(id));
    $('redes-extras').innerHTML = marcadas.map(id => `
        <label class="field">
            <span><i class='bx ${iconePlataforma(id)}'></i> ${rotulo('plataforma', id)}</span>
            <input type="url" data-rede="${esc(id)}" value="${esc(valores[id] ?? '')}" placeholder="https://...">
        </label>`).join('');
}

// Marcar/desmarcar uma plataforma mostra/esconde o campo de link dela.
$('categorias').addEventListener('change', event => {
    if (event.target.name === 'plataforma') montarRedesExtras();
});

// ---------- Nova tag / plataforma / idioma ----------
const normalizarNomeTag = texto => normalizar(texto).replace(/\s+/g, ' ').trim();

// Mesma regra do servidor (lib/tags.js): no mesmo grupo, nenhum nome (em nenhum idioma) pode se repetir.
function opcaoRepetida(grupo, pt, en) {
    const id = slug(pt);
    const nomes = [pt, en].map(normalizarNomeTag).filter(Boolean);
    const [idExistente, nomesExistentes] = Object.entries(FILTROS[grupo].opcoes)
        .find(([idOpcao, nome]) => idOpcao === id || [nome.pt, nome.en].some(n => nomes.includes(normalizarNomeTag(n)))) ?? [];
    return idExistente ? nomesExistentes : null;
}

const formDoGrupo = grupo => $('categorias').querySelector(`.nova-tag[data-grupo="${grupo}"]`);

function validarNovaOpcao(form) {
    const grupo = form.dataset.grupo;
    const pt = form.querySelector('.opcao-pt').value.trim();
    const en = form.querySelector('.opcao-en').value.trim();
    const repetida = (pt || en) && opcaoRepetida(grupo, pt, en);
    form.querySelector('.form-error').textContent = repetida
        ? `${CADASTRAVEIS[grupo].jaExiste} "${repetida.pt}" (${repetida.en}).` : '';
    form.querySelector('[data-acao="salvar"]').disabled = !pt || !en || Boolean(repetida) || !slug(pt);
}

function abrirNovaOpcao(grupo) {
    const form = formDoGrupo(grupo);
    $('categorias').querySelector(`.chip-add[data-grupo="${grupo}"]`).hidden = true;
    form.hidden = false;
    form.querySelector('.opcao-pt').value = '';
    form.querySelector('.opcao-en').value = '';
    validarNovaOpcao(form);
    form.querySelector('.opcao-pt').focus();
}

function fecharNovaOpcao(form) {
    form.hidden = true;
    $('categorias').querySelector(`.chip-add[data-grupo="${form.dataset.grupo}"]`).hidden = false;
}

async function salvarNovaOpcao(form) {
    validarNovaOpcao(form);
    const botao = form.querySelector('[data-acao="salvar"]');
    if (botao.disabled) return;
    const grupo = form.dataset.grupo;
    botao.disabled = true;
    try {
        const { tag, tags } = await chamar('admin/tags', {
            method: 'POST',
            body: JSON.stringify({ grupo, pt: form.querySelector('.opcao-pt').value, en: form.querySelector('.opcao-en').value })
        });
        aplicarTags(tags);
        montarCategorias();
        // Já marca a opção nova na Vtuber que está sendo editada.
        const input = editor.querySelector(`#categorias input[name="${grupo}"][value="${CSS.escape(tag.id)}"]`);
        if (input) input.checked = true;
        if (grupo === 'plataforma') montarRedesExtras();
        alterado = true;
        toast(CADASTRAVEIS[grupo].criada.replace('{nome}', tag.pt));
    } catch (e) {
        form.querySelector('.form-error').textContent = e.message;
        botao.disabled = false;
    }
}

// Os elementos são recriados em montarCategorias(), então os eventos ficam no contêiner.
$('categorias').addEventListener('click', event => {
    const alvo = event.target.closest('button[data-acao]');
    if (!alvo) return;
    const form = alvo.closest('.nova-tag');
    if (alvo.dataset.acao === 'abrir') abrirNovaOpcao(alvo.dataset.grupo);
    else if (alvo.dataset.acao === 'cancelar') fecharNovaOpcao(form);
    else if (alvo.dataset.acao === 'salvar') salvarNovaOpcao(form);
});

$('categorias').addEventListener('input', event => {
    const form = event.target.closest('.nova-tag');
    if (form) validarNovaOpcao(form);
});

$('categorias').addEventListener('keydown', event => {
    const form = event.target.closest('.nova-tag');
    if (!form) return;
    if (event.key === 'Enter') {
        event.preventDefault(); // não envia o formulário da Vtuber
        salvarNovaOpcao(form);
    } else if (event.key === 'Escape') {
        fecharNovaOpcao(form);
    }
});

function confirmarDescarte() {
    return !alterado || confirm('Há alterações não salvas. Descartar?');
}

// Preenche os campos que já existem na lista (nome, cor, categorias, imagens).
function preencherResumo(vt) {
    const campos = editor.elements;
    campos.nome.value = vt?.nome ?? '';
    campos.id.value = vt?.id ?? '';
    campos.cor.value = vt?.cor ?? '#e45fd9';
    $('cor-hex').textContent = campos.cor.value;
    editor.style.setProperty('--accent', campos.cor.value);
    editor.querySelectorAll('#categorias input').forEach(input => {
        input.checked = Boolean(vt?.[input.name]?.includes(input.value));
    });
    mostrarImagem('card', vt?.img, vt?.imgMini);
    mostrarImagem('perfil', vt?.imgPerfil && vt.imgPerfil !== vt.img ? vt.imgPerfil : null);

    $('editor-modo').textContent = vt ? 'Editando' : 'Cadastro';
    $('editor-titulo').textContent = vt ? vt.nome : 'Nova Vtuber';
    $('excluir').hidden = !vt;
    $('ver-perfil').hidden = !vt;
    if (vt) $('ver-perfil').href = urlPerfil(vt.id);
}

// Preenche bio, redes e vídeos (vêm do pedido de detalhes).
function preencherDetalhes(vt) {
    const campos = editor.elements;
    campos.fuso.value = vt?.fuso ?? FUSOS[0].id;
    agendaEl.innerHTML = '';
    (vt?.agenda ?? []).forEach(adicionarHorario);
    campos.bio.value = vt?.bio ?? '';
    campos.bioEn.value = vt?.bioEn ?? '';
    atualizarStatusIngles();
    REDES.forEach(rede => { campos[rede].value = vt?.redes?.[rede] ?? ''; });
    montarRedesExtras(vt?.redes ?? {});
    videosEl.innerHTML = '';
    (vt?.videos ?? []).forEach(v => adicionarVideo(linkDoVideo(v)));
}

function carregandoDetalhes(sim) {
    editor.classList.toggle('loading-details', sim);
    $('salvar').disabled = sim;
    $('excluir').disabled = sim;
}

async function abrirEditor(id) {
    if (id === atual && !editor.hidden) return;
    if (!confirmarDescarte()) return;

    const pedido = ++pedidoAtual;
    atual = id;
    imagensNovas = {};
    idEditadoManualmente = Boolean(id);
    alterado = false;
    $('erro-editor').textContent = '';

    const resumo = id ? vtubers.find(v => v.id === id) : null;
    preencherResumo(resumo);
    preencherDetalhes(null);
    selecionarAba(abasBio[0]);

    $('nada-selecionado').hidden = true;
    editor.hidden = false;
    marcarSelecionada();
    if (window.matchMedia('(max-width: 960px)').matches) {
        editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (!id) {
        carregandoDetalhes(false);
        editor.elements.nome.focus();
        return;
    }

    carregandoDetalhes(true);
    try {
        const vt = await buscarDetalhes(id);
        if (pedido !== pedidoAtual) return; // o usuário já clicou em outra Vtuber
        preencherDetalhes(vt);
    } catch (e) {
        if (pedido !== pedidoAtual) return;
        toast(e.message, 'erro');
    } finally {
        if (pedido === pedidoAtual) carregandoDetalhes(false);
    }
}

function fecharEditor() {
    pedidoAtual++;
    atual = null;
    editor.hidden = true;
    $('nada-selecionado').hidden = false;
    marcarSelecionada();
}

$('cancelar').addEventListener('click', () => {
    if (!confirmarDescarte()) return;
    alterado = false;
    fecharEditor();
});

editor.addEventListener('input', event => {
    if (event.target.closest('.nova-tag')) return; // digitar uma opção nova não altera a Vtuber
    alterado = true;
    const campos = editor.elements;
    if (event.target === campos.nome && !idEditadoManualmente) {
        campos.id.value = slug(campos.nome.value);
    }
    if (event.target === campos.id) idEditadoManualmente = true;
    if (event.target === campos.cor) {
        $('cor-hex').textContent = campos.cor.value;
        editor.style.setProperty('--accent', campos.cor.value);
    }
});

// ---------- Abas da bio (Português / English) ----------
const abasBio = [...editor.querySelectorAll('.tabs [role="tab"]')];

function selecionarAba(aba) {
    abasBio.forEach(outra => {
        const ativa = outra === aba;
        outra.setAttribute('aria-selected', ativa);
        outra.tabIndex = ativa ? 0 : -1;
        $(outra.getAttribute('aria-controls')).hidden = !ativa;
    });
}

abasBio.forEach((aba, i) => {
    aba.addEventListener('click', () => selecionarAba(aba));
    aba.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const proxima = abasBio[(i + (event.key === 'ArrowRight' ? 1 : -1) + abasBio.length) % abasBio.length];
        selecionarAba(proxima);
        proxima.focus();
    });
});

// Mostra na aba "English" se a tradução ainda está faltando.
function atualizarStatusIngles() {
    const vazio = !editor.elements.bioEn.value.trim();
    const status = $('status-bio-en');
    status.textContent = vazio ? 'vazia' : '✓';
    status.className = `tab-status ${vazio ? 'pendente' : 'ok'}`;
}

editor.elements.bioEn.addEventListener('input', atualizarStatusIngles);

// ---------- Imagens ----------
// Mostra primeiro a miniatura (já em cache pela lista) e troca pela imagem grande quando carregar.
function mostrarImagem(tipo, src, previa) {
    const preview = editor.querySelector(`.image-field[data-tipo="${tipo}"] .image-preview`);
    const img = preview.querySelector('img');
    const final = src?.startsWith('data:') ? src : imagemUrl(src);

    img.onload = null;
    if (!final) {
        img.removeAttribute('src');
        preview.classList.remove('has-image', 'is-loading');
        return;
    }
    preview.classList.add('has-image');
    if (previa && !src.startsWith('data:')) {
        img.src = imagemUrl(previa);
        preview.classList.add('is-loading');
        const grande = new Image();
        grande.onload = () => {
            if (img.dataset.alvo !== final) return; // outra Vtuber já foi aberta
            img.src = final;
            preview.classList.remove('is-loading');
        };
        img.dataset.alvo = final;
        grande.src = final;
    } else {
        img.dataset.alvo = final;
        img.src = final;
        preview.classList.remove('is-loading');
    }
}

// Reduz a imagem no navegador antes do envio (o servidor gera as versões finais).
function redimensionar(arquivo, maximo) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        img.onload = () => {
            const escala = Math.min(1, maximo / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/webp', 0.9));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Não foi possível ler essa imagem.'));
        };
        img.src = url;
    });
}

editor.querySelectorAll('.image-field input[type="file"]').forEach(input => {
    input.addEventListener('change', async () => {
        const arquivo = input.files[0];
        input.value = '';
        if (!arquivo) return;
        const tipo = input.closest('.image-field').dataset.tipo;
        try {
            imagensNovas[tipo] = await redimensionar(arquivo, TAMANHO_MAXIMO[tipo]);
            mostrarImagem(tipo, imagensNovas[tipo]);
            alterado = true;
        } catch (e) {
            toast(e.message, 'erro');
        }
    });
});

// ---------- Agenda de lives ----------
const agendaEl = $('agenda');
const DIAS_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ORDEM_DOS_DIAS = [1, 2, 3, 4, 5, 6, 0]; // mostra de segunda a domingo

$('fuso-vtuber').innerHTML = opcoesDeFuso(FUSOS[0].id);

function adicionarHorario(horario = { dias: [], inicio: '', fim: null }) {
    const li = document.createElement('li');
    li.className = 'agenda-row';
    li.innerHTML = `
        <div class="dias" role="group" aria-label="Dias da semana">
            ${ORDEM_DOS_DIAS.map(dia => `
                <label class="dia" title="${DIAS_NOMES[dia]}">
                    <input type="checkbox" value="${dia}" ${horario.dias.includes(dia) ? 'checked' : ''}>
                    <span>${DIAS_CURTOS[dia]}</span>
                </label>`).join('')}
        </div>
        <label class="hora"><span class="sr-only">Início</span><input type="time" class="inicio" value="${horario.inicio}" required></label>
        <span class="ate">até</span>
        <label class="hora"><span class="sr-only">Término (opcional)</span><input type="time" class="fim" value="${horario.fim ?? ''}"></label>
        <button type="button" class="icon-btn danger" title="Remover horário"><i class='bx bx-x'></i></button>`;
    agendaEl.appendChild(li);
    return li;
}

function coletarAgenda() {
    return [...agendaEl.querySelectorAll('.agenda-row')].map(li => ({
        dias: [...li.querySelectorAll('.dias input:checked')].map(input => Number(input.value)),
        inicio: li.querySelector('.inicio').value,
        fim: li.querySelector('.fim').value || null
    }));
}

agendaEl.addEventListener('click', event => {
    const botao = event.target.closest('.icon-btn.danger');
    if (!botao) return;
    botao.closest('.agenda-row').remove();
    alterado = true;
});

$('add-horario').addEventListener('click', () => {
    adicionarHorario().querySelector('.dias input').focus();
});

// ---------- Momentos do criador (YouTube e Twitch) ----------
function adicionarVideo(url = '') {
    const li = document.createElement('li');
    li.className = 'video-row';
    li.innerHTML = `
        <span class="video-thumb"><img alt="" loading="lazy"><i class='bx'></i></span>
        <input type="url" placeholder="Link do YouTube ou da Twitch" aria-label="Link do momento">
        <span class="video-tipo"></span>
        <button type="button" class="icon-btn" title="Subir"><i class='bx bx-up-arrow-alt'></i></button>
        <button type="button" class="icon-btn danger" title="Remover"><i class='bx bx-x'></i></button>`;
    li.querySelector('input').value = url;
    atualizarVideo(li);
    videosEl.appendChild(li);
    return li;
}

// Mostra o tipo detectado e a miniatura (a Twitch não tem miniatura pública: usa o ícone dela).
function atualizarVideo(li) {
    const texto = li.querySelector('input').value.trim();
    const video = identificarVideo(texto);
    const thumb = li.querySelector('.video-thumb');
    const img = thumb.querySelector('img');
    if (video?.tipo === 'youtube') img.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
    else img.removeAttribute('src');
    thumb.dataset.tipo = video?.tipo ?? '';
    thumb.querySelector('i').className = `bx ${video?.tipo.startsWith('twitch') ? 'bxl-twitch' : ''}`;
    li.querySelector('.video-tipo').textContent = texto ? descricaoDoVideo(video) : '';
    li.classList.toggle('invalid', Boolean(texto) && !video);
}

videosEl.addEventListener('input', event => {
    if (event.target.type === 'url') atualizarVideo(event.target.closest('.video-row'));
});

videosEl.addEventListener('click', event => {
    const botao = event.target.closest('.icon-btn');
    if (!botao) return;
    const li = botao.closest('.video-row');
    if (botao.classList.contains('danger')) li.remove();
    else if (li.previousElementSibling) videosEl.insertBefore(li, li.previousElementSibling);
    alterado = true;
});

$('add-video').addEventListener('click', () => {
    adicionarVideo().querySelector('input[type="url"]').focus();
});

// ---------- Salvar ----------
function coletar() {
    const campos = editor.elements;
    const marcados = grupo => [...editor.querySelectorAll(`#categorias input[name="${grupo}"]:checked`)].map(i => i.value);
    const videos = [...videosEl.querySelectorAll('.video-row')]
        .map(li => ({ url: li.querySelector('input[type="url"]').value.trim() }))
        .filter(v => v.url);

    return {
        id: campos.id.value.trim(),
        nome: campos.nome.value.trim(),
        cor: campos.cor.value,
        bio: campos.bio.value,
        bioEn: campos.bioEn.value,
        tags: marcados('tags'),
        horario: marcados('horario'),
        plataforma: marcados('plataforma'),
        idioma: marcados('idioma'),
        redes: {
            ...Object.fromEntries(REDES.map(r => [r, campos[r].value.trim()])),
            ...linksDasRedesExtras()
        },
        videos,
        fuso: campos.fuso.value,
        agenda: coletarAgenda(),
        imagens: imagensNovas
    };
}

function validarNoCliente(dados) {
    if (!dados.nome) return 'Informe o nome.';
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(dados.id)) return 'Identificador inválido: use só minúsculas, números e hífens.';
    if (!atual && !dados.imagens.card) return 'Escolha a imagem do card.';
    if (dados.videos.some(v => !identificarVideo(v.url))) return 'Há um link em "Momentos do criador" que não foi reconhecido (marcado em vermelho).';
    const semDia = dados.agenda.findIndex(h => !h.dias.length);
    if (semDia >= 0) return `Agenda: escolha pelo menos um dia no horário ${semDia + 1}.`;
    const semHora = dados.agenda.findIndex(h => !h.inicio);
    if (semHora >= 0) return `Agenda: informe a hora de início no horário ${semHora + 1}.`;
    return null;
}

// Atualiza a lista local com a Vtuber salva, sem buscar tudo de novo no servidor.
function aplicarSalvo(idAnterior, salvo) {
    const { bio, bioEn, redes, videos, ...resumo } = salvo;
    const indice = vtubers.findIndex(v => v.id === idAnterior);
    if (indice >= 0) vtubers[indice] = resumo;
    else vtubers.unshift(resumo);
    if (idAnterior) detalhes.delete(idAnterior);
    detalhes.set(salvo.id, Promise.resolve(salvo));

    const antigo = idAnterior && listaEl.querySelector(`button[data-id="${CSS.escape(idAnterior)}"]`)?.closest('li');
    const novo = itemDaLista(resumo);
    if (antigo) antigo.replaceWith(novo);
    else listaEl.prepend(novo);
    filtrarLista();
}

editor.addEventListener('submit', async event => {
    event.preventDefault();
    const dados = coletar();
    const problema = validarNoCliente(dados);
    $('erro-editor').textContent = problema || '';
    if (problema) return;

    const idAnterior = atual;
    const botao = $('salvar');
    botao.disabled = true;
    botao.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>Salvando...";
    try {
        const salvo = await chamar(idAnterior ? `admin/vtubers?id=${encodeURIComponent(idAnterior)}` : 'admin/vtubers', {
            method: idAnterior ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });
        toast(idAnterior ? 'Alterações salvas!' : 'Vtuber cadastrada!');
        aplicarSalvo(idAnterior, salvo);
        alterado = false;
        atual = null; // força reabrir com os dados salvos
        await abrirEditor(salvo.id);
    } catch (e) {
        $('erro-editor').textContent = e.message;
    } finally {
        botao.disabled = false;
        botao.innerHTML = "<i class='bx bx-save'></i>Salvar";
    }
});

// ---------- Excluir (com confirmação) ----------
const confirmacao = $('excluir-confirmacao');

$('excluir').addEventListener('click', () => {
    const vt = vtubers.find(v => v.id === atual);
    $('excluir-nome').textContent = vt?.nome ?? atual;
    $('excluir-id').textContent = atual;
    confirmacao.value = '';
    $('confirmar-exclusao').disabled = true;
    modal.showModal();
    confirmacao.focus();
});

confirmacao.addEventListener('input', () => {
    $('confirmar-exclusao').disabled = confirmacao.value.trim() !== atual;
});

modal.addEventListener('close', async () => {
    const id = atual;
    if (modal.returnValue !== 'confirmar' || confirmacao.value.trim() !== id) return;
    try {
        await chamar(`admin/vtubers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        toast('Vtuber excluída.');
        vtubers = vtubers.filter(v => v.id !== id);
        detalhes.delete(id);
        listaEl.querySelector(`button[data-id="${CSS.escape(id)}"]`)?.closest('li').remove();
        alterado = false;
        fecharEditor();
        filtrarLista();
    } catch (e) {
        toast(e.message, 'erro');
    }
});

window.addEventListener('beforeunload', event => {
    if (alterado) event.preventDefault();
});

// ---------- Início ----------
chamar('sessao')
    .then(({ logado }) => (logado ? mostrarPainel() : mostrarLogin()))
    .catch(mostrarLogin);
