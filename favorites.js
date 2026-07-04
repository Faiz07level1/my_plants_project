import { plantCatalog, userFavorites, setLocalFavorites, saveFavoritesToServer } from './data.js';
import { renderPlantGrid, renderCatalog } from './catalog.js';
import { showToast } from './utils.js';

export function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    container.innerHTML = '';
    
    const favoritePlants = plantCatalog.filter(function(p) { return userFavorites.includes(p.id); });
    
    if (favoritePlants.length === 0) {
        container.innerHTML = '<p>Список избранного пуст.</p>';
        return;
    }
    renderPlantGrid(favoritePlants, container, false);
}

export async function toggleFavorite(event, id) {
    event.stopPropagation();
    const index = userFavorites.indexOf(id);
    let isAdded = false;
    
    if (index === -1) {
        userFavorites.push(id);
        showToast("Добавлено в избранное");
        isAdded = true;
    } else {
        userFavorites.splice(index, 1);
        showToast("Удалено из избранного");
    }
    
    await saveFavoritesToServer();
    
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



