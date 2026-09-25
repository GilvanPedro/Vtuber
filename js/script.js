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

    const fatos = [
        ['tags', 'bx-purchase-tag'],
        ['horario', 'bx-time-five'],
        ['plataforma', 'bx-broadcast'],
        ['idioma', 'bx-globe']
    ].filter(([grupo]) => vt[grupo].length).map(([grupo, icone]) => `
        <div class="fact">
            <span class="fact-label"><i class='bx ${icone}'></i>${tituloDoGrupo(grupo)}</span>
            ${vt[grupo].map(v => `<span class="chip">${rotulo(grupo, v)}</span>`).join('')}
        </div>`).join('');

    const redes = [
        ['twitch', 'social-twitch', 'bxl-twitch', 'Twitch'],
        ['youtube', 'social-youtube', 'bxl-youtube', 'YouTube'],
        ['x', 'social-x', 'bxl-twitter', 'X / Twitter'],
        ['kick', 'social-kick', 'bx-play-circle', 'Kick']
    ].filter(([rede]) => vt.redes[rede]).map(([rede, classe, icone, nome]) => `
        <a class="social ${classe}" href="${esc(vt.redes[rede])}" target="_blank" rel="noopener">
            <i class='bx ${icone}'></i>${nome}
        </a>`).join('');

    const videos = vt.videos.map((v, i) => `
        <div class="video${v.vertical ? ' vertical' : ''}">
            <iframe src="https://www.youtube.com/embed/${esc(v.id)}" title="${esc(t('perfil.video', { n: i + 1, nome: vt.nome }))}" loading="lazy"
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
                    <div class="profile-facts">${fatos}</div>
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
                    <h2 class="panel-title">${videos.length > 1 ? t('perfil.videos') : t('perfil.destaque')}</h2>
                    <div class="video-list">${videos.join('')}</div>
                </div>` : ''}
            </div>
        </section>`;
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
