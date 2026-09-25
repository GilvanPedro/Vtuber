/*
 * Fuso horário escolhido pelo visitante (funciona como o idioma: vale para o site todo e fica salvo).
 * Carregado em todas as páginas, antes de vtubers-data.js. Os ids precisam bater com FUSOS em lib/validar.js.
 */
const FUSOS = [
    { id: 'America/Sao_Paulo', pt: 'Brasil (Brasília)', en: 'Brazil (Brasília)', curto: { pt: '🇧🇷 Brasília', en: '🇧🇷 Brasília' } },
    { id: 'America/New_York', pt: 'EUA (Leste)', en: 'USA (Eastern)', curto: { pt: '🇺🇸 EUA Leste', en: '🇺🇸 US Eastern' } },
    { id: 'America/Los_Angeles', pt: 'EUA (Pacífico)', en: 'USA (Pacific)', curto: { pt: '🇺🇸 EUA Pacífico', en: '🇺🇸 US Pacific' } },
    { id: 'Europe/Paris', pt: 'Europa (Central)', en: 'Europe (Central)', curto: { pt: '🇪🇺 Europa', en: '🇪🇺 Europe' } }
];

const idiomaDoFuso = () => (typeof IDIOMA !== 'undefined' ? IDIOMA : 'pt');

// Palpite inicial a partir do fuso do navegador (o mais próximo da lista).
function fusoDoNavegador() {
    let fuso = '';
    try { fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* navegador antigo */ }
    if (FUSOS.some(f => f.id === fuso)) return fuso;
    if (fuso.startsWith('Europe/')) return 'Europe/Paris';
    if (/^America\/(Los_Angeles|Vancouver|Tijuana|Phoenix|Denver|Boise|Edmonton)|^US\/(Pacific|Mountain|Arizona)/.test(fuso)) return 'America/Los_Angeles';
    if (/^America\/(New_York|Chicago|Detroit|Toronto|Montreal|Winnipeg|Indiana|Kentucky)|^US\//.test(fuso)) return 'America/New_York';
    return 'America/Sao_Paulo';
}

function fusoAtual() {
    try {
        const salvo = localStorage.getItem('fuso');
        if (FUSOS.some(f => f.id === salvo)) return salvo;
    } catch { /* sem armazenamento */ }
    return fusoDoNavegador();
}

function escolherFuso(id) {
    try { localStorage.setItem('fuso', id); } catch { /* sem armazenamento */ }
}

const nomeDoFuso = id => FUSOS.find(f => f.id === id)?.[idiomaDoFuso()] ?? id;

// Opções de <select>; "curto" usa os nomes com bandeira do cabeçalho.
const opcoesDeFuso = (selecionado, curto = false) => FUSOS.map(f =>
    `<option value="${f.id}" ${f.id === selecionado ? 'selected' : ''}>${curto ? f.curto[idiomaDoFuso()] : nomeDoFuso(f.id)}</option>`).join('');

// Seletor global do cabeçalho: ao trocar, recarrega a página já no novo fuso (como o PT | EN).
const seletorDeFuso = document.getElementById('fuso-global');
if (seletorDeFuso) {
    seletorDeFuso.innerHTML = opcoesDeFuso(fusoAtual(), true);
    seletorDeFuso.addEventListener('change', () => {
        escolherFuso(seletorDeFuso.value);
        location.reload();
    });
}
