import { plantCatalog, userFavorites } from './data.js';
import { toggleFavorite } from './favorites.js';
import { openAddToCollectionForm } from './collection.js';

export function renderCatalog() {
    const container = document.getElementById('catalog-list');
    if (!container) return;
    container.innerHTML = '';
    
    // Передаем актуальные массивы, которые к этому моменту уже скачались
    renderPlantGrid(plantCatalog, container, true);
}

export function renderPlantGrid(list, container, showAddBtn) {
    list.forEach(function(plant) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        cardContainer.setAttribute('id', 'catalog-card-' + plant.id);
        
        // Проверяем сердечко напрямую из актуального массива, скачанного с сервера
        let isFav = userFavorites.includes(plant.id);
        let heartIcon = isFav ? '❤️' : '🤍';
        let badgeClass = plant.isToxic ? 'danger' : 'safe';
        let badgeText = plant.isToxic ? 'Ядовито' : 'Безопасно';
        
        cardContainer.innerHTML = 
            '<div class="card-inner">' +
                '<div class="card-front">' +
                    '<button class="fav-btn" data-id="' + plant.id + '">' + heartIcon + '</button>' +
                    '<h3>' + plant.name + '</h3>' +
                    '<div class="plant-img" style="background-image: url(\'' + plant.img + '\');"></div>' +
                    '<button class="btn btn-secondary">Посмотреть уход</button>' +
                '</div>' +
                '<div class="card-back">' +
                    '<h3>' + plant.name + '</h3>' +
                    '<p><span class="label">💧 Полив:</span> ' + plant.watering + '</p>' +
                    '<p><span class="label">☀️ Освещение:</span> ' + plant.lighting + '</p>' +
                    '<p><span class="label">🪴 Пересадка:</span> ' + plant.repotting + '</p>' +
                    '<p><span class="label">⚠️ Ядовитость:</span> <span class="badge ' + badgeClass + '">' + badgeText + '</span> — ' + plant.toxicity + '</p>' +
                    (plant.features ? '<p><span class="label">✨ Особые заметки:</span> ' + plant.features + '</p>' : '') +
                    '<div style="display:flex; gap:10px; width:100%; margin-top:auto; padding-top:10px;">' +
                        (showAddBtn ? '<button class="btn btn-primary btn-add">Добавить</button>' : '') +
                        '<button class="btn btn-secondary">Назад</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        cardContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('fav-btn')) {
                toggleFavorite(e, parseInt(e.target.getAttribute('data-id')));
            } else if (e.target.classList.contains('btn-add')) {
                openAddToCollectionForm(plant.id);
            } else {
                cardContainer.classList.toggle('flipped');
            }
        });
        container.appendChild(cardContainer);
    });
}

export function showCatalogCard(catalogId) {
    window.switchPage('catalog');
    setTimeout(function() {
        const card = document.getElementById('catalog-card-' + catalogId);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('flipped');
        }
    }, 100);
}








