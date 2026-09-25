/*
 * Idioma do site (pt/en).
 * - A escolha fica salva no navegador; na primeira visita usa o idioma do navegador.
 * - No HTML: data-i18n="chave" (texto), data-i18n-html (HTML), data-i18n-placeholder,
 *   data-i18n-aria-label, data-i18n-alt, data-i18n-title e data-i18n-content (meta).
 * - No JS: t('chave', { variavel: valor }).
 */
const IDIOMAS = ['pt', 'en'];

const IDIOMA = (() => {
    try {
        const salvo = localStorage.getItem('idioma');
        if (IDIOMAS.includes(salvo)) return salvo;
    } catch { /* navegação privada */ }
    return (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
})();

document.documentElement.lang = IDIOMA === 'pt' ? 'pt-BR' : 'en';

const TEXTOS = {
    pt: {
        // Comum
        'nav.aria': 'Principal',
        'nav.home': 'Home',
        'nav.vtubers': 'Vtubers',
        'nav.sobre': 'Sobre',
        'menu.abrir': 'Abrir menu',
        'idioma.aria': 'Idioma',
        'footer.copy': 'Copyright © 2025 by Gilvan Pedro. Todos os direitos reservados.',
        'footer.aria': 'Rodapé',
        'footer.indicar': 'Indicar Vtuber',
        'footer.remocao': 'Solicitar remoção',

        // Home
        'home.title': 'Vtuber Search',
        'home.desc': 'Descubra Vtubers independentes e menos conhecidas.',
        'home.eyebrow': 'Descubra novos talentos',
        'home.titulo': 'Encontre sua próxima <span class="gradient-text">Vtuber favorita</span>',
        'home.texto': 'O Vtuber Search ajuda você a descobrir Vtubers independentes ou menos conhecidas, dando visibilidade para talentos que merecem ser reconhecidos. Filtre por conteúdo, horário, plataforma e idioma e encontre quem combina com você.',
        'home.explorar': 'Explorar Vtubers',
        'home.indicar': 'Indicar alguém',
        'home.sorte': 'Estou com sorte',
        'home.sorteTitulo': 'Abre o perfil de uma Vtuber aleatória',
        'home.sorteando': 'Sorteando uma Vtuber...',
        'home.statVtubers': 'Vtubers no site',
        'home.statPlataformas': 'Plataformas',
        'home.statIdiomas': 'Idiomas',
        'home.logoAlt': 'Logo do Vtuber Search',
        'home.novidades': 'Novidades',
        'home.recentes': 'Recém-adicionadas',
        'home.verTodas': 'Ver todas',
        'home.como': 'Como funciona',
        'home.feito': 'Feito para quem ama Vtubers',
        'home.f1t': 'Descubra',
        'home.f1p': 'Busque pelo nome ou combine filtros de conteúdo, horário, plataforma e idioma.',
        'home.f2t': 'Apoie',
        'home.f2p': 'Cada perfil traz bio, clipe em destaque e links diretos para Twitch, YouTube e X.',
        'home.f3t': 'Participe',
        'home.f3p': 'Indique Vtubers que você acompanha ou peça a remoção do seu perfil quando quiser.',
        'home.cta1Eyebrow': 'Indicações',
        'home.cta1t': 'Deseja aparecer aqui?',
        'home.cta1p': 'Você é uma Vtuber ou conhece alguma que merece mais visibilidade? Envie as informações e vamos analisar com carinho para adicionar o perfil o quanto antes!',
        'home.cta1Btn': 'Indicar Vtuber',
        'home.cta2Eyebrow': 'Privacidade',
        'home.cta2t': 'Não quer aparecer aqui?',
        'home.cta2p': 'Respeitamos totalmente sua vontade. Envie uma solicitação de remoção e seu conteúdo será retirado o mais rápido possível, sem complicações.',
        'home.cta2Btn': 'Solicitar remoção',
        'home.erro': 'Não foi possível carregar as Vtubers agora.',

        // Lista
        'lista.title': 'Vtubers · Vtuber Search',
        'lista.desc': 'Busque Vtubers por nome, conteúdo, horário, plataforma e idioma.',
        'lista.eyebrow': 'Catálogo',
        'lista.h1': 'Vtubers',
        'lista.texto': 'Procure pelo nome ou combine filtros para encontrar quem faz o tipo de live que você gosta.',
        'lista.buscaLabel': 'Buscar pelo nome',
        'lista.buscaPh': 'Buscar pelo nome...',
        'lista.ordenar': 'Ordenar',
        'fuso.label': 'Fuso horário',
        'lista.recentes': 'Mais recentes',
        'lista.az': 'Nome (A–Z)',
        'lista.filtros': 'Filtros',
        'lista.limpar': 'Limpar filtros',
        'lista.vazioT': 'Ninguém por aqui...',
        'lista.vazioP': 'Nenhuma Vtuber combina com essa busca. Tente remover alguns filtros.',
        'lista.paginacao': 'Paginação',
        'lista.anterior': 'Página anterior',
        'lista.proxima': 'Próxima página',
        'lista.nenhuma': 'Nenhuma Vtuber encontrada',
        'lista.mostrando': 'Mostrando <strong>{inicio}–{fim}</strong> de <strong>{total}</strong> Vtubers',
        'lista.encontradas': '<strong>{n}</strong> Vtubers encontradas',
        'lista.encontrada': '<strong>1</strong> Vtuber encontrada',
        'lista.carregando': 'Carregando Vtubers...',
        'lista.erro': 'Não foi possível carregar as Vtubers agora. Tente recarregar a página.',

        // Perfil
        'perfil.title': '{nome} · Vtuber Search',
        'perfil.titlePadrao': 'Vtuber · Vtuber Search',
        'perfil.desc': 'Bio, horários, plataformas, vídeos e redes sociais da Vtuber.',
        'perfil.voltar': 'Todas as Vtubers',
        'perfil.sobre': 'Sobre',
        'perfil.momentos': 'Momentos do criador',
        'perfil.agenda': 'Horários das lives',
        'stats.seguidores': 'seguidores na Twitch',
        'stats.inscritos': 'inscritos no YouTube',
        'perfil.semBio': 'Bio ainda não cadastrada.',
        'perfil.bioOutroIdioma': '',
        'perfil.video': 'Momento {n} de {nome}',
        'perfil.ops': 'Ops!',
        'perfil.naoExiste': 'Essa Vtuber não existe ou foi removida do site.',
        'perfil.erro': 'Não foi possível carregar esta Vtuber agora. Tente de novo em instantes.',
        'perfil.verTodas': 'Ver todas as Vtubers',

        // Sobre
        'sobre.title': 'Sobre · Vtuber Search',
        'sobre.desc': 'Quem criou o Vtuber Search.',
        'sobre.fotoAlt': 'Foto de Gilvan Pedro',
        'sobre.eyebrow': 'Quem fez o site',
        'sobre.h1': 'Oi, eu sou o <span class="gradient-text">Gilvan Pedro</span>',
        'sobre.p1': 'Tenho 18 anos e sou apaixonado por tecnologia, criatividade e descobertas. Nascido e criado no Brasil, atualmente estou cursando Engenharia de Software no SENAI Goiás, onde me aprofundo todos os dias no universo da programação, desenvolvimento de sistemas e criação de soluções tecnológicas com propósito.',
        'sobre.p2': 'Meu maior objetivo é me tornar um desenvolvedor completo, que não só entende de lógica e programação, mas que também sabe ouvir, observar o mundo ao redor e criar experiências que importam. Estou trilhando meu caminho com foco, dedicação e curiosidade. Isso é só o começo da minha carreira!',
        'sobre.curso': 'Engenharia de Software',
        'sobre.pais': 'Brasil',
        'sobre.portfolio': 'Portfólio',

        // Formulários
        'form.voltar': 'Voltar para a Home',
        'form.naoCarregou': 'O formulário não carregou?',
        'form.novaAba': 'Abrir em nova aba',
        'form.idiomaAviso': '',
        'entrar.title': 'Indicar Vtuber · Vtuber Search',
        'entrar.desc': 'Indique uma Vtuber para aparecer no site.',
        'entrar.eyebrow': 'Indicações',
        'entrar.h1': 'Indicar uma Vtuber',
        'entrar.p': 'Você é uma Vtuber ou conhece alguma que merece mais visibilidade? Conta pra gente!',
        'entrar.s1': '<strong>Preencha o formulário</strong> com o nome e os links da Vtuber.',
        'entrar.s2': '<strong>A gente analisa</strong> o perfil com carinho.',
        'entrar.s3': '<strong>O perfil entra no site</strong> e aparece em “Recém-adicionadas”.',
        'entrar.iframe': 'Formulário de indicação de Vtuber',
        'sair.title': 'Solicitar remoção · Vtuber Search',
        'sair.desc': 'Peça a remoção do seu perfil do site.',
        'sair.eyebrow': 'Privacidade',
        'sair.h1': 'Solicitar remoção',
        'sair.p': 'Encontrou sua imagem ou nome no site e prefere não participar? Respeitamos totalmente sua vontade.',
        'sair.s1': '<strong>Preencha o formulário</strong> identificando o perfil.',
        'sair.s2': '<strong>A gente confere</strong> a solicitação.',
        'sair.s3': '<strong>O conteúdo é removido</strong> o mais rápido possível.',
        'sair.iframe': 'Formulário de solicitação de remoção'
    },

    en: {
        'nav.aria': 'Main',
        'nav.home': 'Home',
        'nav.vtubers': 'Vtubers',
        'nav.sobre': 'About',
        'menu.abrir': 'Open menu',
        'idioma.aria': 'Language',
        'footer.copy': 'Copyright © 2025 by Gilvan Pedro. All rights reserved.',
        'footer.aria': 'Footer',
        'footer.indicar': 'Suggest a Vtuber',
        'footer.remocao': 'Request removal',

        'home.title': 'Vtuber Search',
        'home.desc': 'Discover independent and lesser-known Vtubers.',
        'home.eyebrow': 'Discover new talent',
        'home.titulo': 'Find your next <span class="gradient-text">favorite Vtuber</span>',
        'home.texto': 'Vtuber Search helps you discover independent and lesser-known Vtubers, giving visibility to talent that deserves recognition. Filter by content, schedule, platform and language to find the right match for you.',
        'home.explorar': 'Explore Vtubers',
        'home.indicar': 'Suggest someone',
        'home.sorte': "I'm feeling lucky",
        'home.sorteTitulo': 'Opens the profile of a random Vtuber',
        'home.sorteando': 'Rolling for a Vtuber...',
        'home.statVtubers': 'Vtubers listed',
        'home.statPlataformas': 'Platforms',
        'home.statIdiomas': 'Languages',
        'home.logoAlt': 'Vtuber Search logo',
        'home.novidades': "What's new",
        'home.recentes': 'Recently added',
        'home.verTodas': 'See all',
        'home.como': 'How it works',
        'home.feito': 'Made for Vtuber fans',
        'home.f1t': 'Discover',
        'home.f1p': 'Search by name or combine filters for content, schedule, platform and language.',
        'home.f2t': 'Support',
        'home.f2p': 'Every profile has a bio, a featured clip and direct links to Twitch, YouTube and X.',
        'home.f3t': 'Join in',
        'home.f3p': 'Suggest Vtubers you watch, or ask for your profile to be removed at any time.',
        'home.cta1Eyebrow': 'Suggestions',
        'home.cta1t': 'Want to be featured here?',
        'home.cta1p': "Are you a Vtuber, or do you know one who deserves more visibility? Send us the details and we'll review the profile carefully and add it as soon as possible!",
        'home.cta1Btn': 'Suggest a Vtuber',
        'home.cta2Eyebrow': 'Privacy',
        'home.cta2t': "Don't want to be listed?",
        'home.cta2p': 'We fully respect your wishes. Send a removal request and your content will be taken down as quickly as possible, no questions asked.',
        'home.cta2Btn': 'Request removal',
        'home.erro': "Couldn't load the Vtubers right now.",

        'lista.title': 'Vtubers · Vtuber Search',
        'lista.desc': 'Search Vtubers by name, content, schedule, platform and language.',
        'lista.eyebrow': 'Catalog',
        'lista.h1': 'Vtubers',
        'lista.texto': 'Search by name or combine filters to find streamers who make the kind of content you enjoy.',
        'lista.buscaLabel': 'Search by name',
        'lista.buscaPh': 'Search by name...',
        'lista.ordenar': 'Sort',
        'fuso.label': 'Time zone',
        'lista.recentes': 'Newest',
        'lista.az': 'Name (A–Z)',
        'lista.filtros': 'Filters',
        'lista.limpar': 'Clear filters',
        'lista.vazioT': 'Nobody here...',
        'lista.vazioP': 'No Vtuber matches this search. Try removing some filters.',
        'lista.paginacao': 'Pagination',
        'lista.anterior': 'Previous page',
        'lista.proxima': 'Next page',
        'lista.nenhuma': 'No Vtubers found',
        'lista.mostrando': 'Showing <strong>{inicio}–{fim}</strong> of <strong>{total}</strong> Vtubers',
        'lista.encontradas': '<strong>{n}</strong> Vtubers found',
        'lista.encontrada': '<strong>1</strong> Vtuber found',
        'lista.carregando': 'Loading Vtubers...',
        'lista.erro': "Couldn't load the Vtubers right now. Try reloading the page.",

        'perfil.title': '{nome} · Vtuber Search',
        'perfil.titlePadrao': 'Vtuber · Vtuber Search',
        'perfil.desc': "The Vtuber's bio, schedule, platforms, videos and social links.",
        'perfil.voltar': 'All Vtubers',
        'perfil.sobre': 'About',
        'perfil.momentos': 'Creator moments',
        'perfil.agenda': 'Stream schedule',
        'stats.seguidores': 'Twitch followers',
        'stats.inscritos': 'YouTube subscribers',
        'perfil.semBio': 'No bio yet.',
        'perfil.bioOutroIdioma': 'This bio is only available in Portuguese.',
        'perfil.video': 'Moment {n} of {nome}',
        'perfil.ops': 'Oops!',
        'perfil.naoExiste': "This Vtuber doesn't exist or has been removed from the site.",
        'perfil.erro': "Couldn't load this Vtuber right now. Please try again in a moment.",
        'perfil.verTodas': 'See all Vtubers',

        'sobre.title': 'About · Vtuber Search',
        'sobre.desc': 'Who made Vtuber Search.',
        'sobre.fotoAlt': 'Photo of Gilvan Pedro',
        'sobre.eyebrow': 'Who made this site',
        'sobre.h1': "Hi, I'm <span class=\"gradient-text\">Gilvan Pedro</span>",
        'sobre.p1': "I'm 18 years old and passionate about technology, creativity and discovery. Born and raised in Brazil, I'm currently studying Software Engineering at SENAI Goiás, where I dive deeper every day into programming, systems development and building technology with purpose.",
        'sobre.p2': "My biggest goal is to become a well-rounded developer: one who doesn't just understand logic and code, but also knows how to listen, observe the world and create experiences that matter. I'm following my path with focus, dedication and curiosity. This is only the beginning of my career!",
        'sobre.curso': 'Software Engineering',
        'sobre.pais': 'Brazil',
        'sobre.portfolio': 'Portfolio',

        'form.voltar': 'Back to Home',
        'form.naoCarregou': "Form didn't load?",
        'form.novaAba': 'Open in a new tab',
        'form.idiomaAviso': 'The form itself is in Portuguese.',
        'entrar.title': 'Suggest a Vtuber · Vtuber Search',
        'entrar.desc': 'Suggest a Vtuber to be featured on the site.',
        'entrar.eyebrow': 'Suggestions',
        'entrar.h1': 'Suggest a Vtuber',
        'entrar.p': 'Are you a Vtuber, or do you know one who deserves more visibility? Tell us!',
        'entrar.s1': "<strong>Fill out the form</strong> with the Vtuber's name and links.",
        'entrar.s2': '<strong>We review</strong> the profile carefully.',
        'entrar.s3': '<strong>The profile goes live</strong> and shows up under “Recently added”.',
        'entrar.iframe': 'Vtuber suggestion form',
        'sair.title': 'Request removal · Vtuber Search',
        'sair.desc': 'Ask for your profile to be removed from the site.',
        'sair.eyebrow': 'Privacy',
        'sair.h1': 'Request removal',
        'sair.p': 'Found your image or name on the site and would rather not be included? We fully respect your wishes.',
        'sair.s1': '<strong>Fill out the form</strong> identifying the profile.',
        'sair.s2': '<strong>We check</strong> the request.',
        'sair.s3': '<strong>The content is removed</strong> as quickly as possible.',
        'sair.iframe': 'Removal request form'
    }
};

function t(chave, variaveis = {}) {
    const texto = TEXTOS[IDIOMA][chave] ?? TEXTOS.pt[chave] ?? chave;
    return texto.replace(/\{(\w+)\}/g, (_, nome) => variaveis[nome] ?? '');
}

function traduzirPagina(raiz = document) {
    raiz.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    raiz.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    for (const atributo of ['placeholder', 'aria-label', 'alt', 'title', 'content']) {
        const dataset = `i18n${atributo.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}`;
        raiz.querySelectorAll(`[data-i18n-${atributo}]`).forEach(el => {
            el.setAttribute(atributo, t(el.dataset[dataset]));
        });
    }
}

// Seletor PT | EN do cabeçalho
function montarSeletorDeIdioma() {
    document.querySelectorAll('.lang-switch button[data-lang]').forEach(botao => {
        botao.setAttribute('aria-pressed', botao.dataset.lang === IDIOMA);
        botao.addEventListener('click', () => {
            if (botao.dataset.lang === IDIOMA) return;
            try { localStorage.setItem('idioma', botao.dataset.lang); } catch { /* sem armazenamento */ }
            location.reload();
        });
    });
}

traduzirPagina();
montarSeletorDeIdioma();
