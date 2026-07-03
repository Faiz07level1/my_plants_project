import { plantCatalog } from './data.js';
import { renderPlantGrid, renderCatalog } from './catalog.js';
import { showToast } from './utils.js';

export function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    container.innerHTML = '';
    
    const favorites = JSON.parse(localStorage.getItem('plant_favorites')) || [];
    const favoritePlants = plantCatalog.filter(function(p) { return favorites.includes(p.id); });
    
    if (favoritePlants.length === 0) {
        container.innerHTML = '<p>Список избранного пуст.</p>';
        return;
    }
    renderPlantGrid(favoritePlants, container, false);
}

export function toggleFavorite(event, id) {
    event.stopPropagation();
    let favorites = JSON.parse(localStorage.getItem('plant_favorites')) || [];
    const index = favorites.indexOf(id);
    let isAdded = false;
    

    if (index === -1) {
        favorites.push(id);
        showToast("Добавлено в избранное");
        isAdded = true;
    } else {
        favorites.splice(index, 1);
        showToast("Удалено из избранного");
    }
    localStorage.setItem('plant_favorites', JSON.stringify(favorites));
    

    if (document.getElementById('catalog').classList.contains('active')) {

        const card = document.getElementById('catalog-card-' + id);
        if (card) {
            const favBtn = card.querySelector('.fav-btn');
            if (favBtn) {

                favBtn.textContent = isAdded ? '❤️' : '🤍';
            }
        }
    }
    

    if (document.getElementById('favorites').classList.contains('active')) {
        renderFavorites();
    }
}


