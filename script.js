import { plantCatalog } from './data.js';
import { getDaysStatus, getMonthsStatus, showToast, requestNotificationPermission, sendSystemNotification } from './utils.js';

let myCollection = JSON.parse(localStorage.getItem('my_plant_collection')) || [];
let favorites = JSON.parse(localStorage.getItem('plant_favorites')) || [];

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(function(page) { page.classList.remove('active'); });
    document.querySelectorAll('.menu-btn').forEach(function(btn) { btn.classList.remove('active'); });
    
    document.getElementById(pageId).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(function(btn) {
        return btn.getAttribute('onclick').includes(pageId);
    });
    if (activeBtn) activeBtn.classList.add('active');

    if (pageId === 'catalog') renderCatalog();
    if (pageId === 'my-plants') renderCollection();
    if (pageId === 'favorites') renderFavorites();
    
    checkNotifications();
}

function renderCatalog() {
    const container = document.getElementById('catalog-list');
    if (!container) return;
    container.innerHTML = '';
    renderPlantGrid(plantCatalog, container, true);
}

function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    container.innerHTML = '';
    
    const favoritePlants = plantCatalog.filter(function(p) { return favorites.includes(p.id); });
    
    if (favoritePlants.length === 0) {
        container.innerHTML = '<p>Список избранного пуст.</p>';
        return;
    }
    renderPlantGrid(favoritePlants, container, false);
}

function renderPlantGrid(list, container, showAddBtn) {
    list.forEach(function(plant) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        cardContainer.setAttribute('id', 'catalog-card-' + plant.id);
        
        let isFav = favorites.includes(plant.id);
        let heartIcon = isFav ? '❤️' : '🤍';
        let badgeClass = plant.isToxic ? 'danger' : 'safe';
        
        cardContainer.innerHTML = 
            '<div class="card-inner">' +
                '<div class="card-front">' +
                    '<button class="fav-btn" onclick="window.toggleFavorite(event, ' + plant.id + ')">' + heartIcon + '</button>' +
                    '<h3>' + plant.name + '</h3>' +
                    '<div class="plant-img" style="background-image: url(\'' + plant.img + '\');"></div>' +
                    '<button class="btn btn-secondary">Посмотреть уход</button>' +
                '</div>' +
                '<div class="card-back">' +
                    '<h3>' + plant.name + '</h3>' +
                    '<p><span class="label">Полив:</span> ' + plant.watering + '</p>' +
                    '<p><span class="label">Освещение:</span> ' + plant.lighting + '</p>' +
                    '<p><span class="label">Пересадка:</span> ' + plant.repotting + '</p>' +
                    '<p><span class="badge ' + badgeClass + '">' + (plant.isToxic ? 'Ядовито' : 'Безопасно') + '</span> — ' + plant.toxicity + '</p>' +
                    (plant.features ? '<p><span class="label">✨ Особые заметки:</span> ' + plant.features + '</p>' : '') +
                    '<div style="display:flex; gap:10px; width:100%; margin-top:auto; padding-top:10px;">' +
                        (showAddBtn ? '<button class="btn btn-primary btn-add" data-id="' + plant.id + '">Добавить в коллекцию</button>' : '') +
                        '<button class="btn btn-secondary">Назад</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        cardContainer.addEventListener('click', function(e) {
            if (!e.target.classList.contains('fav-btn') && !e.target.classList.contains('btn-add')) {
                cardContainer.classList.toggle('flipped');
            }
        });
        
        if (showAddBtn) {
            cardContainer.querySelector('.btn-add').addEventListener('click', function(e) {
                e.stopPropagation();
                openAddToCollectionForm(plant.id);
            });
        }
        
        container.appendChild(cardContainer);
    });
}

function toggleFavorite(event, id) {
    event.stopPropagation();
    const index = favorites.indexOf(id);
    if (index === -1) {
        favorites.push(id);
        showToast("Добавлено в избранное");
    } else {
        favorites.splice(index, 1);
        showToast("Удалено из избранного");
    }
    localStorage.setItem('plant_favorites', JSON.stringify(favorites));
    
    if (document.getElementById('catalog').classList.contains('active')) renderCatalog();
    if (document.getElementById('favorites').classList.contains('active')) renderFavorites();
}

function openAddToCollectionForm(plantId) {
    const plant = plantCatalog.find(function(p) { return p.id === plantId; });
    if (!plant) return;

    document.getElementById('form-plant-id').value = plant.id;
    document.getElementById('form-plant-name').value = plant.name;
    document.getElementById('form-plant-notes').value = '';
    document.getElementById('form-plant-water-interval').value = 7;
    document.getElementById('form-plant-repot-interval').value = 12;

    switchPage('add-to-collection-page');
}

function saveToCollection(event) {
    event.preventDefault();
    const plantId = parseInt(document.getElementById('form-plant-id').value);
    const plantData = plantCatalog.find(function(p) { return p.id === plantId; });

    const userPlant = {
        instanceId: Date.now(),
        catalogId: plantId,
        name: plantData.name,
        addedDate: new Date().toLocaleDateString('ru-RU'),
        notes: document.getElementById('form-plant-notes').value,
        waterInterval: parseInt(document.getElementById('form-plant-water-interval').value),
        repotInterval: parseInt(document.getElementById('form-plant-repot-interval').value),
        lastWatered: new Date().toISOString(),
        lastRepotted: new Date().toISOString()
    };

    myCollection.push(userPlant);
    localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
    switchPage('my-plants');
    showToast('Добавлено в личную коллекцию!');
}

function showCatalogCard(catalogId) {
    switchPage('catalog');
    setTimeout(function() {
        const card = document.getElementById('catalog-card-' + catalogId);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('flipped');
        }
    }, 100);
}

function actionWater(instanceId) {
    const plant = myCollection.find(function(item) { return item.instanceId === instanceId; });
    if (plant) {
        plant.lastWatered = new Date().toISOString();
        localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
        renderCollection();
        showToast("Полив отмечен!");
    }
}

function actionRepot(instanceId) {
    const plant = myCollection.find(function(item) { return item.instanceId === instanceId; });
    if (plant) {
        plant.lastRepotted = new Date().toISOString();
        localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
        renderCollection();
        showToast("Пересадка отмечена!");
    }
}

function removeFromCollection(instanceId) {
    myCollection = myCollection.filter(function(item) { return item.instanceId !== instanceId; });
    localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
    renderCollection();
}

function renderCollection() {
    const container = document.getElementById('my-plants-list');
    if (!container) return;
    container.innerHTML = '';

    if (myCollection.length === 0) {
        container.innerHTML = '<p>Ваша коллекция пуста.</p>';
        return;
    }

    myCollection.forEach(function(plant) {
        const waterDays = getDaysStatus(plant.lastWatered, plant.waterInterval);
        const repotDays = getMonthsStatus(plant.lastRepotted, plant.repotInterval);

        let waterText = waterDays > 0 ? "Через " + waterDays + " дн." : "Требуется полив!";
        let repotText = repotDays > 0 ? "Через " + repotDays + " дн." : "Требуется пересадка!";
        let isAlert = waterDays <= 0 || repotDays <= 0;

        const card = document.createElement('div');
        card.className = 'my-plant-card' + (isAlert ? ' alert-active' : '');
        card.innerHTML = 
            '<h3>' + plant.name + '</h3>' +
            '<p><span class="label">📅 Дата добавления:</span> ' + plant.addedDate + '</p>' +
            (plant.notes ? '<p class="user-note"><span class="label">📝 Заметка:</span> ' + plant.notes + '</p>' : '') +
            '<p><span class="label">🔔 Параметры напоминаний:</span> Полив каждые ' + plant.waterInterval + ' дн., пересадка каждые ' + plant.repotInterval + ' мес.</p>' +
            '<p><span class="label">Статус полива:</span> ' + waterText + '</p>' +
            '<p><span class="label">Статус пересадки:</span> ' + repotText + '</p>' +
            '<div style="display:flex; gap:10px; margin-top:10px;">' +
                '<button class="btn btn-secondary btn-water">Полил(а)</button>' +
                '<button class="btn btn-secondary btn-repot">Пересадил(а)</button>' +
            '</div>' +
            '<button class="btn btn-secondary btn-link" style="margin-top:10px;">🔗 Перейти к карточке справочника</button>' +
            '<button class="btn btn-danger btn-remove" style="margin-top:10px;">Удалить из коллекции</button>';
        
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-water')) actionWater(plant.instanceId);
            if (e.target.classList.contains('btn-repot')) actionRepot(plant.instanceId);
            if (e.target.classList.contains('btn-remove')) removeFromCollection(plant.instanceId);
if (e.target.classList.contains('btn-link')) showCatalogCard(plant.catalogId);
});
container.appendChild(card);
});
}
function checkNotifications() {
const panel = document.getElementById('alert-panel');
const list = document.getElementById('alert-list');
if (!panel || !list) return;
list.innerHTML = '';
let activeAlerts = 0;
let plantsToWater = [];
let plantsToRepot = [];
myCollection.forEach(function(plant) {
const waterDays = getDaysStatus(plant.lastWatered, plant.waterInterval);
const repotDays = getMonthsStatus(plant.lastRepotted, plant.repotInterval);
if (waterDays <= 0) {
const li = document.createElement('li');
li.textContent = '💧 Полить ' + plant.name;
list.appendChild(li);
plantsToWater.push(plant.name);
activeAlerts++;
}
if (repotDays <= 0) {
const li = document.createElement('li');
li.textContent = '🪴 Пересадить ' + plant.name;
list.appendChild(li);
plantsToRepot.push(plant.name);
activeAlerts++;
}
});
panel.style.display = activeAlerts > 0 ? 'block' : 'none';
if (plantsToWater.length > 0) {
sendSystemNotification("Время полива! 💧", "Необходимо полить следующие растения: " + plantsToWater.join(", "));
}
if (plantsToRepot.length > 0) {
sendSystemNotification("Время пересадки! 🪴", "Пора пересадить: " + plantsToRepot.join(", "));
}
}
window.switchPage = switchPage;
window.toggleFavorite = toggleFavorite;
window.saveToCollection = saveToCollection;
renderCatalog();
requestNotificationPermission();
setTimeout(checkNotifications, 1000);





