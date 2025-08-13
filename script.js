const menuHamburguer = document.querySelector('.menu-hamburguer');
menuHamburguer.addEventListener('click', () => {
    toggleMenu();
});

function toggleMenu(){
    const nav = document.querySelector('.nav-responsive');
    menuHamburguer.classList.toggle('change');

    if (menuHamburguer.classList.contains('change')){
        nav.style.display = 'block';
    } else{
        nav.style.display = 'none';
    }
}

document.getElementById('filter-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Pegando os valores dos filtros
    const tagFilter = document.getElementById('tag-filter').value.toLowerCase();
    const timeFilter = document.getElementById('time-filter').value.toLowerCase();
    const platFilter = document.getElementById('plat-filter').value.toLowerCase();
    const langFilter = document.getElementById('lang-filter').value.toLowerCase();

    // Obtendo todos os itens
    const items = document.querySelectorAll('.item');

    items.forEach(function(item) {
        // Obtém os atributos do item
        const tags = item.getAttribute('data-tags').toLowerCase();
        const time = item.getAttribute('data-time').toLowerCase();
        const day = item.getAttribute('data-plat').toLowerCase();
        const idioma = item.getAttribute('data-lang').toLowerCase();

        // Verifica se o item atende aos filtros
        const matchTag = tagFilter === "" || tags.includes(tagFilter);
        const matchTime = timeFilter === "" || time.includes(timeFilter);
        const matchPlat = platFilter === "" || day.includes(platFilter);
        const matchLang = langFilter === "" || idioma.includes(langFilter);

        // Exibir se todos os filtros forem correspondentes
        if (matchTag && matchTime && matchPlat && matchLang) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});
