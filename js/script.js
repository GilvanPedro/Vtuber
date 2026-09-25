// Menu mobile
const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        const aberto = header.classList.toggle('menu-open');
        menuToggle.setAttribute('aria-expanded', aberto);
    });
}

// Home: Vtubers recém-adicionadas
const recentes = document.getElementById('recentes');
if (recentes) {
    recentes.replaceChildren(...cardsCarregando(5));
    carregarVtubers()
        .then(lista => {
            recentes.replaceChildren(...lista.slice(0, 5).map(criarCardVtuber));
            document.getElementById('total-vtubers').textContent = lista.length;
            document.getElementById('total-plataformas').textContent = Object.keys(FILTROS.plataforma.opcoes).length;
        })
        .catch(() => {
            recentes.innerHTML = `<p class="section-sub">${t('home.erro')}</p>`;
        });
}

// Perfil: html/vtuber.html?id=<id>
const perfil = document.getElementById('perfil');
if (perfil) {
    carregarPerfil(new URLSearchParams(location.search).get('id'));
}

async function carregarPerfil(id) {
    let vt = null;
    try {
        vt = id ? await carregarVtuber(id) : null;
    } catch {
        mostrarErroPerfil(t('perfil.erro'));
        return;
    }
    if (!vt) {
        mostrarErroPerfil(t('perfil.naoExiste'));
        return;
    }

    document.title = t('perfil.title', { nome: vt.nome });
    document.documentElement.style.setProperty('--accent', vt.cor);

    const redesFixas = [
        ['twitch', 'social-twitch', 'bxl-twitch', 'Twitch'],
        ['youtube', 'social-youtube', 'bxl-youtube', 'YouTube'],
        ['x', 'social-x', 'bxl-twitter', 'X / Twitter'],
        ['kick', 'social-kick', 'bx-play-circle', 'Kick'],
        ['instagram', 'social-instagram', 'bxl-instagram', 'Instagram']
    ];
    // Links de plataformas cadastradas pelo painel (ex.: TikTok), com o nome e ícone da plataforma
    const redesExtras = Object.keys(vt.redes)
        .filter(rede => !redesFixas.some(([fixa]) => fixa === rede))
        .map(rede => [rede, 'social-extra', iconePlataforma(rede), rotulo('plataforma', rede)]);
    const redes = [...redesFixas, ...redesExtras].filter(([rede]) => vt.redes[rede]).map(([rede, classe, icone, nome]) => `
        <a class="social ${classe}" href="${esc(vt.redes[rede])}" target="_blank" rel="noopener">
            <i class='bx ${icone}'></i>${nome}
        </a>`).join('');

    const videos = vt.videos.map((v, i) => `
        <div class="video${v.vertical ? ' vertical' : ''}">
            <iframe src="${esc(urlDoPlayer(v))}" title="${esc(t('perfil.video', { n: i + 1, nome: vt.nome }))}" loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>`);

    const bio = bioNoIdioma(vt);

    const imagem = vt.imgPerfil
        ? `<img src="${esc(urlDoSite(vt.imgPerfil.replace(/^\//, '')))}" alt="${esc(vt.nome)}">`
        : '';

    perfil.innerHTML = `
        <section class="profile-hero">
            <div class="container">
                <div class="profile-art">${imagem}</div>
                <div>
                    <a class="back-link" href="./vtubers.html"><i class='bx bx-chevron-left'></i>${t('perfil.voltar')}</a>
                    <h1 class="profile-name">${esc(vt.nome)}</h1>
                    <div class="profile-facts" id="perfil-fatos">${htmlDosFatos(vt)}</div>
                    <div id="perfil-agenda">${htmlDaAgenda(vt)}</div>
                    <div class="socials">${redes}</div>
                </div>
            </div>
        </section>

        <section class="section profile-body">
            <div class="container">
                <article class="panel bio">
                    <h2 class="panel-title">${t('perfil.sobre')}</h2>
                    ${bio.fallback ? `<p class="bio-note"><i class='bx bx-info-circle'></i>${t('perfil.bioOutroIdioma')}</p>` : ''}
                    <div${bio.fallback ? ' lang="pt-BR"' : ''}>${renderizarBio(bio.texto) || `<p>${t('perfil.semBio')}</p>`}</div>
                </article>
                ${videos.length ? `
                <div class="panel">
                    <h2 class="panel-title">${t('perfil.momentos')}</h2>
                    <div class="video-list">${videos.join('')}</div>
                </div>` : ''}
            </div>
        </section>`;
}

// Conteúdo, horário (no fuso escolhido), plataforma e idioma
function htmlDosFatos(vt) {
    return [
        ['tags', 'bx-purchase-tag', vt.tags],
        ['horario', 'bx-time-five', periodosDaVtuber(vt)],
        ['plataforma', 'bx-broadcast', vt.plataforma],
        ['idioma', 'bx-globe', vt.idioma]
    ].filter(([, , valores]) => valores.length).map(([grupo, icone, valores]) => `
        <div class="fact">
            <span class="fact-label"><i class='bx ${icone}'></i>${tituloDoGrupo(grupo)}</span>
            ${valores.map(v => `<span class="chip">${rotulo(grupo, v)}</span>`).join('')}
        </div>`).join('');
}

// Dias e horários das lives convertidos para o fuso escolhido pelo visitante
function htmlDaAgenda(vt) {
    if (!vt.agenda?.length) return '';
    const fuso = fusoAtual();
    const linhas = agendaNoFuso(vt, fuso).map(item => `
        <li>
            <span class="schedule-days">${item.dias.map(nomeDoDia).join(', ')}</span>
            <span class="schedule-time">${formatarHora(item.inicio)}${item.fim ? ` – ${formatarHora(item.fim)}` : ''}</span>
        </li>`).join('');
    return `
        <div class="schedule">
            <div class="schedule-head">
                <span class="fact-label"><i class='bx bx-calendar'></i>${t('perfil.agenda')}</span>
                <span class="schedule-tz"><i class='bx bx-time-five'></i>${esc(nomeDoFuso(fuso))}</span>
            </div>
            <ul class="schedule-list">${linhas}</ul>
        </div>`;
}

// Player de cada momento do criador. A Twitch exige o domínio do site no parâmetro "parent".
function urlDoPlayer({ tipo = 'youtube', id }) {
    const parent = encodeURIComponent(location.hostname);
    const video = encodeURIComponent(id);
    if (tipo === 'twitch-clip') return `https://clips.twitch.tv/embed?clip=${video}&parent=${parent}&autoplay=false`;
    if (tipo === 'twitch-video') return `https://player.twitch.tv/?video=${video}&parent=${parent}&autoplay=false`;
    return `https://www.youtube.com/embed/${video}`;
}

function mostrarErroPerfil(mensagem) {
    perfil.innerHTML = `
        <section class="section">
            <div class="container empty-state">
                <i class='bx bx-ghost'></i>
                <h3>${t('perfil.ops')}</h3>
                <p>${mensagem}</p>
                <a href="./vtubers.html" class="btn btn-ghost">${t('perfil.verTodas')}</a>
            </div>
        </section>`;
}
