import { plantCatalog } from './data.js';
import { getDaysStatus, getMonthsStatus, showToast } from './utils.js';

let myCollection = JSON.parse(localStorage.getItem('my_plant_collection')) || [];

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(function(page) {
        page.classList.remove('active');
    });
    document.querySelectorAll('.menu-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(function(btn) {
        return btn.getAttribute('onclick').includes(pageId);
    });
    if (activeBtn) activeBtn.classList.add('active');

    if (pageId === 'catalog') renderCatalog();
    if (pageId === 'my-plants') renderCollection();
}

window.switchPage = switchPage;

function renderCatalog() {
    const container = document.getElementById('catalog-list');
    container.innerHTML = '';

    plantCatalog.forEach(function(plant) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        
        let badgeClass = plant.isToxic ? 'danger' : 'safe';
        
        cardContainer.innerHTML = 
            '<div class="card-inner">' +
                '<div class="card-front">' +
                    '<h3>' + plant.name + '</h3>' +
                    '<div class="plant-img" style="background-image: url(\'' + plant.img + '\'); background-size: cover; background-position: center; font-size: 0;"></div>' +
                    '<button class="btn btn-secondary btn-flip">Посмотреть</button>' +
                '</div>' +
                '<div class="card-back">' +
                    '<h3>' + plant.name + '</h3>' +
                    '<p><span class="label">Полив:</span> ' + plant.watering + '</p>' +
                    '<p><span class="label">Освещение:</span> ' + plant.lighting + '</p>' +
                    '<p><span class="label">Пересадка:</span> ' + plant.repotting + '</p>' +
                    '<p><span class="badge ' + badgeClass + '">' + plant.toxicity + '</span></p>' +
                    '<div style="display:flex; gap:10px; width:100%; margin-top:auto;">' +
                        '<button class="btn btn-primary btn-add" data-id="' + plant.id + '">Добавить</button>' +
                        '<button class="btn btn-secondary btn-flip">Назад</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        cardContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-add')) {
                const plantId = parseInt(e.target.getAttribute('data-id'));
                openAddToCollectionForm(plantId);
            } else {
                cardContainer.classList.toggle('flipped');
            }
        });
        
        container.appendChild(cardContainer);
    });
}

function openAddToCollectionForm(plantId) {
    const plant = plantCatalog.find(function(p) {
        return p.id === plantId;
    });
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
    const notes = document.getElementById('form-plant-notes').value;
    const waterInterval = parseInt(document.getElementById('form-plant-water-interval').value);
    const repotInterval = parseInt(document.getElementById('form-plant-repot-interval').value);
    
    const plantData = plantCatalog.find(function(p) {
        return p.id === plantId;
    });

    const userPlant = {
        instanceId: Date.now(),
        catalogId: plantId,
        name: plantData.name,
        addedDate: new Date().toLocaleDateString('ru-RU'),
        notes: notes,
        waterInterval: waterInterval,
        repotInterval: repotInterval,
        lastWatered: new Date().toISOString(),
        lastRepotted: new Date().toISOString()
    };

    myCollection.push(userPlant);
    localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
    
    switchPage('my-plants');
    showToast('Растение успешно добавлено!');
}

window.saveToCollection = saveToCollection;

function removeFromCollection(instanceId) {
    myCollection = myCollection.filter(function(item) {
        return item.instanceId !== instanceId;
    });
    localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
    renderCollection();
    showToast("Растение удалено из коллекции");
}

function actionWater(instanceId) {
    const plant = myCollection.find(function(item) {
        return item.instanceId === instanceId;
    });
    if (plant) {
        plant.lastWatered = new Date().toISOString();
        localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
        renderCollection();
        showToast("Полито!");
    }
}

function actionRepot(instanceId) {
    const plant = myCollection.find(function(item) {
        return item.instanceId === instanceId;
    });
    if (plant) {
        plant.lastRepotted = new Date().toISOString();
        localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
        renderCollection();
        showToast("Пересажено!");
    }
}

function renderCollection() {
    const container = document.getElementById('my-plants-list');
    container.innerHTML = '';

    if (myCollection.length === 0) {
        container.innerHTML = '<p>Ваша коллекция пуста. Добавьте растения из справочника.</p>';
        return;
    }

    myCollection.forEach(function(plant) {
        const waterDaysLeft = getDaysStatus(plant.lastWatered, plant.waterInterval);
        const repotDaysLeft = getMonthsStatus(plant.lastRepotted, plant.repotInterval);

        let waterStatusText = waterDaysLeft > 0 ? "Через " + waterDaysLeft + " дн." : "Требуется полив!";
        let repotStatusText = repotDaysLeft > 0 ? "Через " + repotDaysLeft + " дн." : "Требуется пересадка!";

        const card = document.createElement('div');
        card.className = 'my-plant-card';
        card.innerHTML = 
            '<h3>' + plant.name + '</h3>' +
            '<p><span class="label">Дата добавления:</span> ' + plant.addedDate + '</p>' +
            (plant.notes ? '<p class="user-note"><span class="label">Заметка:</span> ' + plant.notes + '</p>' : '') +
            '<p><span class="label">Полив:</span> ' + waterStatusText + '</p>' +
            '<p><span class="label">Пересадка:</span> ' + repotStatusText + '</p>' +
            '<div style="display:flex; gap:10px; margin-top:10px;">' +
                '<button class="btn btn-secondary btn-water">Полил(а)</button>' +
                '<button class="btn btn-secondary btn-repot">Пересадил(а)</button>' +
            '</div>' +
            '<button class="btn btn-danger btn-remove" style="margin-top:10px;">Удалить</button>';
        
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-water')) actionWater(plant.instanceId);
            if (e.target.classList.contains('btn-repot')) actionRepot(plant.instanceId);
            if (e.target.classList.contains('btn-remove')) removeFromCollection(plant.instanceId);
        });

        container.appendChild(card);
    });
}

function checkNotifications() {
    let alerts = [];
    myCollection.forEach(function(plant) {
        if (getDaysStatus(plant.lastWatered, plant.waterInterval) <= 0) alerts.push("Полить " + plant.name);
        if (getMonthsStatus(plant.lastRepotted, plant.repotInterval) <= 0) alerts.push("Пересадить " + plant.name);
    });
    if (alerts.length > 0) {
        showToast("Напоминание: " + alerts.slice(0, 2).join(', '));
    }
}

renderCatalog();
setTimeout(checkNotifications, 1000);




