/*
 * Painel admin: login, busca, criar, editar e excluir Vtubers.
 * Fala com /api/login, /api/logout, /api/sessao e /api/admin/vtubers.
 */
const $ = id => document.getElementById(id);
const api = caminho => urlDoSite(`api/${caminho}`);

const telaLogin = $('tela-login');
const telaPainel = $('tela-painel');
const editor = $('editor');
const listaEl = $('lista-admin');
const buscaEl = $('busca-admin');
const videosEl = $('videos');
const modal = $('modal-excluir');

const TAMANHO_MAXIMO = { card: 900, perfil: 1400 }; // maior lado da imagem, em px
const REDES = ['twitch', 'youtube', 'x', 'kick'];

let vtubers = [];
let atual = null;          // id da vtuber em edição (null = nova)
let imagensNovas = {};     // { card?: dataUrl, perfil?: dataUrl }
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

function idDoYoutube(url) {
    const texto = url.trim();
    if (/^[\w-]{11}$/.test(texto)) return { id: texto, shorts: false };
    try {
        const u = new URL(texto);
        const id = u.hostname.endsWith('youtu.be')
            ? u.pathname.slice(1)
            : u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
        return /^[\w-]{11}$/.test(id || '') ? { id, shorts: u.pathname.startsWith('/shorts/') } : null;
    } catch {
        return null;
    }
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
    await recarregarLista();
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
    fecharEditor();
    mostrarLogin();
});

// ---------- Lista + busca ----------
async function recarregarLista() {
    try {
        vtubers = await chamar('admin/vtubers');
        renderLista();
    } catch (e) {
        toast(e.message, 'erro');
    }
}

function renderLista() {
    const termo = normalizar(buscaEl.value.trim());
    const filtradas = vtubers.filter(vt => !termo || normalizar(`${vt.nome} ${vt.id}`).includes(termo));
    $('contagem').textContent = termo
        ? `${filtradas.length} de ${vtubers.length} Vtubers`
        : `${vtubers.length} Vtubers cadastradas`;

    listaEl.innerHTML = filtradas.map(vt => `
        <li>
            <button type="button" data-id="${esc(vt.id)}" ${vt.id === atual ? 'aria-current="true"' : ''} style="--accent:${esc(vt.cor)}">
                <span class="admin-thumb">${vt.img ? `<img src="${esc(urlDoSite(vt.img.replace(/^\//, '')))}" alt="" loading="lazy">` : ''}</span>
                <span class="admin-item-text">
                    <strong>${esc(vt.nome)}</strong>
                    <small>${esc(vt.id)}</small>
                </span>
            </button>
        </li>`).join('') || '<li class="admin-empty">Nenhuma Vtuber encontrada.</li>';
}

buscaEl.addEventListener('input', renderLista);

listaEl.addEventListener('click', event => {
    const botao = event.target.closest('button[data-id]');
    if (botao) abrirEditor(botao.dataset.id);
});

$('nova').addEventListener('click', () => abrirEditor(null));

// ---------- Editor ----------
$('categorias').innerHTML = Object.entries(FILTROS).map(([grupo, { titulo, opcoes }]) => `
    <fieldset class="filter-group">
        <legend>${titulo}</legend>
        <div class="filter-options">
            ${Object.entries(opcoes).map(([valor, texto]) => `
                <label class="filter-chip">
                    <input type="checkbox" name="${grupo}" value="${valor}">
                    <span>${texto}</span>
                </label>`).join('')}
        </div>
    </fieldset>`).join('');

function confirmarDescarte() {
    return !alterado || confirm('Há alterações não salvas. Descartar?');
}

async function abrirEditor(id) {
    if (!confirmarDescarte()) return;

    let vt = null;
    if (id) {
        try {
            vt = await chamar(`admin/vtubers?id=${encodeURIComponent(id)}`);
        } catch (e) {
            toast(e.message, 'erro');
            return;
        }
    }

    atual = id;
    imagensNovas = {};
    idEditadoManualmente = Boolean(id);
    $('erro-editor').textContent = '';

    const campos = editor.elements;
    campos.nome.value = vt?.nome ?? '';
    campos.id.value = vt?.id ?? '';
    campos.cor.value = vt?.cor ?? '#e45fd9';
    $('cor-hex').textContent = campos.cor.value;
    campos.bio.value = vt?.bio ?? '';
    REDES.forEach(rede => { campos[rede].value = vt?.redes?.[rede] ?? ''; });
    editor.querySelectorAll('#categorias input').forEach(input => {
        input.checked = Boolean(vt?.[input.name]?.includes(input.value));
    });

    mostrarImagem('card', vt?.img);
    mostrarImagem('perfil', vt?.imgPerfil && vt.imgPerfil !== vt.img ? vt.imgPerfil : null);

    videosEl.innerHTML = '';
    (vt?.videos ?? []).forEach(v => adicionarVideo(
        v.vertical ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`, v.vertical));

    $('editor-modo').textContent = vt ? 'Editando' : 'Cadastro';
    $('editor-titulo').textContent = vt ? vt.nome : 'Nova Vtuber';
    $('excluir').hidden = !vt;
    $('ver-perfil').hidden = !vt;
    if (vt) $('ver-perfil').href = urlPerfil(vt.id);

    $('nada-selecionado').hidden = true;
    editor.hidden = false;
    editor.style.setProperty('--accent', campos.cor.value);
    alterado = false;
    renderLista();
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!vt) campos.nome.focus();
}

function fecharEditor() {
    atual = null;
    editor.hidden = true;
    $('nada-selecionado').hidden = false;
    renderLista();
}

$('cancelar').addEventListener('click', () => {
    if (!confirmarDescarte()) return;
    alterado = false;
    fecharEditor();
});

editor.addEventListener('input', event => {
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

// ---------- Imagens ----------
function mostrarImagem(tipo, src) {
    const preview = editor.querySelector(`.image-field[data-tipo="${tipo}"] .image-preview`);
    const img = preview.querySelector('img');
    if (src) {
        img.src = src.startsWith('data:') ? src : urlDoSite(src.replace(/^\//, ''));
        preview.classList.add('has-image');
    } else {
        img.removeAttribute('src');
        preview.classList.remove('has-image');
    }
}

// Reduz a imagem no navegador e converte para WEBP (mantém transparência).
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
            resolve(canvas.toDataURL('image/webp', 0.88));
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

// ---------- Vídeos ----------
function adicionarVideo(url = '', vertical = false) {
    const li = document.createElement('li');
    li.className = 'video-row';
    li.innerHTML = `
        <img class="video-thumb" alt="">
        <input type="url" placeholder="https://www.youtube.com/watch?v=..." aria-label="Link do vídeo">
        <label class="check"><input type="checkbox"> Vertical</label>
        <button type="button" class="icon-btn" title="Subir"><i class='bx bx-up-arrow-alt'></i></button>
        <button type="button" class="icon-btn danger" title="Remover"><i class='bx bx-x'></i></button>`;
    const [link, check] = li.querySelectorAll('input');
    link.value = url;
    check.checked = vertical;
    atualizarThumb(li);
    videosEl.appendChild(li);
    return li;
}

function atualizarThumb(li) {
    const yt = idDoYoutube(li.querySelector('input[type="url"]').value);
    const thumb = li.querySelector('.video-thumb');
    if (yt) thumb.src = `https://i.ytimg.com/vi/${yt.id}/mqdefault.jpg`;
    else thumb.removeAttribute('src');
    li.classList.toggle('invalid', Boolean(li.querySelector('input[type="url"]').value.trim()) && !yt);
}

videosEl.addEventListener('input', event => {
    const li = event.target.closest('.video-row');
    if (event.target.type === 'url') {
        atualizarThumb(li);
        if (idDoYoutube(event.target.value)?.shorts) li.querySelector('input[type="checkbox"]').checked = true;
    }
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
        .map(li => ({
            url: li.querySelector('input[type="url"]').value.trim(),
            vertical: li.querySelector('input[type="checkbox"]').checked
        }))
        .filter(v => v.url);

    return {
        id: campos.id.value.trim(),
        nome: campos.nome.value.trim(),
        cor: campos.cor.value,
        bio: campos.bio.value,
        tags: marcados('tags'),
        horario: marcados('horario'),
        plataforma: marcados('plataforma'),
        idioma: marcados('idioma'),
        redes: Object.fromEntries(REDES.map(r => [r, campos[r].value.trim()])),
        videos,
        imagens: imagensNovas
    };
}

function validarNoCliente(dados) {
    if (!dados.nome) return 'Informe o nome.';
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(dados.id)) return 'Identificador inválido: use só minúsculas, números e hífens.';
    if (!atual && !dados.imagens.card) return 'Escolha a imagem do card.';
    if (dados.videos.some(v => !idDoYoutube(v.url))) return 'Há um link de vídeo inválido (marcado em vermelho).';
    return null;
}

editor.addEventListener('submit', async event => {
    event.preventDefault();
    const dados = coletar();
    const problema = validarNoCliente(dados);
    $('erro-editor').textContent = problema || '';
    if (problema) return;

    const botao = $('salvar');
    botao.disabled = true;
    botao.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>Salvando...";
    try {
        const salvo = await chamar(atual ? `admin/vtubers?id=${encodeURIComponent(atual)}` : 'admin/vtubers', {
            method: atual ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });
        toast(atual ? 'Alterações salvas!' : 'Vtuber cadastrada!');
        alterado = false;
        await recarregarLista();
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
    if (modal.returnValue !== 'confirmar' || confirmacao.value.trim() !== atual) return;
    try {
        await chamar(`admin/vtubers?id=${encodeURIComponent(atual)}`, { method: 'DELETE' });
        toast('Vtuber excluída.');
        alterado = false;
        fecharEditor();
        await recarregarLista();
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
