
import { plantCatalog, userFavorites } from './data.js';
import { toggleFavorite } from './favorites.js';
import { openAddToCollectionForm } from './collection.js';
import { openPlantChat } from './chat.js';
import { showToast } from './utils.js';

let activeFilter = 'all';

const CATEGORY_LABELS = {
    indoor: '🏠 Комнатное',
    toxic: '☠️ Ядовитое',
    thorny: '🌵 Колючее',
    flowering: '🌸 Цветущее',
    edible: '🍽 Съедобное',
    medicinal: '💊 Лекарственное'
};

export function renderCatalog() {
    const container = document.getElementById('catalog-list');
    if (!container) return;
    container.innerHTML = '';

    const searchInput = document.getElementById('catalog-search');
    const query = searchInput ? searchInput.value : '';

    renderCatalogFiltered(query);
}

export function filterCatalog(query) {
    renderCatalogFiltered(query);
}

export function setActiveFilter(filterId) {
    activeFilter = filterId;

    document.querySelectorAll('#catalog-filters .filter-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filterId);
    });

    const searchInput = document.getElementById('catalog-search');
    renderCatalogFiltered(searchInput ? searchInput.value : '');
}

function renderCatalogFiltered(query) {
    const container = document.getElementById('catalog-list');
    if (!container) return;
    container.innerHTML = '';

    const normalizedQuery = (query || '').trim().toLowerCase();

    let filtered = normalizedQuery
        ? plantCatalog.filter(function (p) { return p.name.toLowerCase().includes(normalizedQuery); })
        : plantCatalog;

    if (activeFilter !== 'all') {
        filtered = filtered.filter(function (p) {
            return Array.isArray(p.types) && p.types.includes(activeFilter);
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p>По вашему запросу ничего не найдено.</p>';
        return;
    }

    renderPlantGrid(filtered, container, true);
}

function hasRealPhoto(plant) {
    return Boolean(plant.img) && !plant.img.startsWith('data:image/svg+xml');
}

export function renderPlantGrid(list, container, showAddBtn) {
    list.forEach(function(plant) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        cardContainer.setAttribute('id', 'catalog-card-' + plant.id);
        
        let isFav = userFavorites.includes(plant.id);
        let heartIcon = isFav ? '❤️' : '🤍';
        let badgeClass = plant.isToxic ? 'danger' : 'safe';
        let badgeText = plant.isToxic ? 'Ядовито' : 'Безопасно';

        const types = Array.isArray(plant.types) ? plant.types : [];
        const typeTagsHtml = types.length
            ? '<p><span class="label">🏷️ Категории:</span> ' +
              types.map(function (t) { return CATEGORY_LABELS[t] || t; }).join(', ') + '</p>'
            : '';

        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(plant.name + ' растение');

        const uploadPhotoHtml = hasRealPhoto(plant)
            ? ''
            : '<label class="upload-photo-label" data-upload-for="' + plant.id + '">' +
                  '📤 Загрузить свою фотографию' +
                  '<input type="file" accept="image/*" class="upload-photo-input" data-plant-id="' + plant.id + '" style="display:none;">' +
              '</label>';
        
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
                    typeTagsHtml +
                    uploadPhotoHtml +
                    '<div style="display:flex; gap:10px; width:100%; margin-top:auto; padding-top:10px; flex-wrap: wrap;">' +
                        (showAddBtn ? '<button class="btn btn-primary btn-add">Добавить</button>' : '') +
                        '<button class="btn btn-chat">💬 Чат</button>' +
                        '<button class="btn btn-search-web">🔍 Найти в интернете</button>' +
                        '<button class="btn btn-secondary">Назад</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        cardContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('fav-btn')) {
                toggleFavorite(e, parseInt(e.target.getAttribute('data-id')));
            } else if (e.target.classList.contains('btn-add')) {
                openAddToCollectionForm(plant.id);
            } else if (e.target.classList.contains('btn-chat')) {
                openPlantChat(plant.id);
            } else if (e.target.classList.contains('btn-search-web')) {
                e.stopPropagation();
                window.open(searchUrl, '_blank', 'noopener');
            } else if (e.target.closest('.upload-photo-label')) {
                e.stopPropagation();
            } else {
                cardContainer.classList.toggle('flipped');
            }
        });

        const uploadInput = cardContainer.querySelector('.upload-photo-input');
        if (uploadInput) {
            uploadInput.addEventListener('click', function (e) { e.stopPropagation(); });
            uploadInput.addEventListener('change', function (e) {
                e.stopPropagation();
                handlePhotoUpload(plant.id, e.target.files[0]);
            });
        }

        container.appendChild(cardContainer);
    });
}

async function handlePhotoUpload(plantId, file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Пожалуйста, выберите файл изображения');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (event) {
        try {
            showToast('Загружаем фотографию...');
            const response = await fetch('/api/catalog/' + plantId + '/photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: event.target.result })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                const plant = plantCatalog.find(function (p) { return p.id === plantId; });
                if (plant) plant.img = result.img;
                showToast('Фотография сохранена!');
                renderCatalog();
            } else {
                showToast(result.error || 'Не удалось загрузить фотографию');
            }
        } catch (error) {
            console.error('Ошибка загрузки фото:', error);
            showToast('Не удалось связаться с сервером');
        }
    };
    reader.readAsDataURL(file);
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
