import { plantCatalog, userCollection, setLocalCollection, saveCollectionToServer } from './data.js';
import { getTimeLeft, showToast } from './utils.js'; 
import { showCatalogCard } from './catalog.js';
import { checkNotifications } from './notifications.js';

export function openAddToCollectionForm(plantId) {
    const plant = plantCatalog.find(function(p) { return p.id === plantId; });
    if (!plant) return;

    document.getElementById('form-plant-id').value = plant.id;
    document.getElementById('form-plant-name').value = plant.name;
    document.getElementById('form-plant-notes').value = '';
    document.getElementById('form-plant-water-days').value = 7;
    document.getElementById('form-plant-water-hours').value = 0;
    document.getElementById('form-plant-water-mins').value = 0;
    
    document.getElementById('form-plant-repot-days').value = 30;
    document.getElementById('form-plant-repot-hours').value = 0;
    document.getElementById('form-plant-repot-mins').value = 0;
    document.getElementById('form-plant-qty').value = 1;

    window.switchPage('add-to-collection-page');
}

export async function saveToCollection(event) {
    event.preventDefault();
    const plantId = parseInt(document.getElementById('form-plant-id').value);
    const plantData = plantCatalog.find(function(p) { return p.id === plantId; });

    const wd = parseInt(document.getElementById('form-plant-water-days').value) || 0;
    const wh = parseInt(document.getElementById('form-plant-water-hours').value) || 0;
    const wm = parseInt(document.getElementById('form-plant-water-mins').value) || 0;
    const waterMinutes = (wd * 24 * 60) + (wh * 60) + wm;

    const rd = parseInt(document.getElementById('form-plant-repot-days').value) || 0;
    const rh = parseInt(document.getElementById('form-plant-repot-hours').value) || 0;
    const rm = parseInt(document.getElementById('form-plant-repot-mins').value) || 0;
    const repotMinutes = (rd * 24 * 60) + (rh * 60) + rm;

    const inputQty = parseInt(document.getElementById('form-plant-qty').value) || 1;
    const existingPlant = userCollection.find(p => p.name === plantData.name);

    if (existingPlant) {
        existingPlant.quantity = (Number(existingPlant.quantity) || 0) + inputQty;
    } else {
        const userPlant = {
            instanceId: Date.now(),
            catalogId: plantId,
            name: plantData.name,
            addedDate: new Date().toLocaleDateString('ru-RU'),
            notes: document.getElementById('form-plant-notes').value,
            waterIntervalMinutes: waterMinutes,
            repotIntervalMinutes: repotMinutes,
            lastWatered: new Date().toISOString(),
            lastRepotted: new Date().toISOString(),
            quantity: inputQty
        };
        userCollection.push(userPlant);
    }

    await saveCollectionToServer();
    
    window.switchPage('my-plants');
    showToast("Добавлено в личную коллекцию!");
}

export function renderCollection() {
    const container = document.getElementById('my-plants-list');
    if (!container) return;
    container.innerHTML = '';

    if (userCollection.length === 0) {
        container.innerHTML = '<p>Ваша коллекция пуста.</p>';
        return;
    }

    userCollection.forEach(function(plant) {
        const card = document.createElement('div');
        card.className = 'my-plant-card';
        card.setAttribute('data-instance-id', plant.instanceId);
        
        card.innerHTML =  
            '<h3>' + plant.name + '</h3>' +
            '<p><span class="label">📅 Дата добавления:</span> ' + plant.addedDate + '</p>' +
            '<p><span class="label">📦 Количество:</span> ' + plant.quantity + ' шт.</p>' +
            (plant.notes ? '<p class="user-note"><span class="label">📝 Заметка:</span> ' + plant.notes + '</p>' : '') +
            '<p><span class="label">🔔 Настройки:</span> Полив каждые ' + plant.waterIntervalMinutes + ' мин.</p>' +
            '<p><span class="label" style="color: #047857;">⏱️ До следующего полива:</span> <span class="timer-water">Загрузка...</span></p>' +
            '<p><span class="label" style="color: #b45309;">⏱️ До следующей пересадки:</span> <span class="timer-repot">Загрузка...</span></p>' +
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

    updateTimers();
}

export function updateTimers() {
    userCollection.forEach(function(plant) {
        const card = document.querySelector('[data-instance-id="' + plant.instanceId + '"]');
        if (!card) return;

        const waterStatus = getTimeLeft(plant.lastWatered, plant.waterIntervalMinutes, "Требуется полив! 💧");
        const repotStatus = getTimeLeft(plant.lastRepotted, plant.repotIntervalMinutes, "Требуется пересадка! 🪴");

        const waterSpan = card.querySelector('.timer-water');
        const repotSpan = card.querySelector('.timer-repot');

        if (waterSpan && waterSpan.textContent !== waterStatus.text) {
            waterSpan.innerHTML = '<strong>' + waterStatus.text + '</strong>';
        }
        if (repotSpan && repotSpan.textContent !== repotStatus.text) {
            repotSpan.innerHTML = '<strong>' + repotStatus.text + '</strong>';
        }

        let isAlert = waterStatus.isOverdue || repotStatus.isOverdue;
        if (isAlert) {
            card.classList.add('alert-active');
        } else {
            card.classList.remove('alert-active');
        }
    });
}

async function actionWater(instanceId) {
    const plant = userCollection.find(function(item) { return item.instanceId === instanceId; });
    if (plant) {
        plant.lastWatered = new Date().toISOString();
        let notifiedWater = JSON.parse(localStorage.getItem('notified_water')) || {};
        delete notifiedWater[instanceId];
        localStorage.setItem('notified_water', JSON.stringify(notifiedWater));
        
        await saveCollectionToServer();
        renderCollection();
        checkNotifications();
        showToast("Полив отмечен!");
    }
}

async function actionRepot(instanceId) {
    const plant = userCollection.find(function(item) { return item.instanceId === instanceId; });
    if (plant) {
        plant.lastRepotted = new Date().toISOString();
        let notifiedRepot = JSON.parse(localStorage.getItem('notified_repot')) || {};
        delete notifiedRepot[instanceId];
        localStorage.setItem('notified_repot', JSON.stringify(notifiedRepot));
        
        await saveCollectionToServer();
        renderCollection();
        checkNotifications();
        showToast("Пересадка отмечена!");
    }
}

async function removeFromCollection(instanceId) {
    const updated = userCollection.filter(function(item) { return item.instanceId !== instanceId; });
    setLocalCollection(updated);
    
    await saveCollectionToServer();
    renderCollection();
    checkNotifications();
}












