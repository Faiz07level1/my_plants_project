const plantCatalog = [
    {
        id: 1,
        name: "Монстера",
        watering: "Обильный после просыхания верхнего слоя земли (каждые 7 дней).",
        lighting: "Яркий рассеянный свет, полутень. Избегать прямых лучей.",
        repotting: "Молодые ежегодно весной, взрослые раз в 2-3 года.",
        toxicity: "Ядовито для домашних животных (вызывает раздражение).",
        isToxic: true,
        features: "Листья нужно регулярно протирать от пыли и опрыскивать."
    },
    {
        id: 2,
        name: "Сансевиерия (Тещин язык)",
        watering: "Редкий. Раз в 2-3 недели летом, зимой раз в месяц.",
        lighting: "Неприхотлива. Растет как на солнце, так и в глубине комнаты.",
        repotting: "Только когда корни заполнят весь горшок (раз в 3-4 года).",
        toxicity: "Слабо ядовито при поедании.",
        isToxic: true,
        features: "Боится избытка влаги и застоя воды в розетке."
    },
    {
        id: 3,
        name: "Хлорофитум",
        watering: "Умеренный. Летом 2 раза в неделю, зимой 1 раз в неделю.",
        lighting: "Яркий рассеянный свет или полутень.",
        repotting: "Ежегодно весной, так как корни растут очень быстро.",
        toxicity: "Безопасно для людей и животных.",
        isToxic: false,
        features: "Отлично очищает воздух в помещении."
    },
    {
        id: 4,
        name: "Фикус Бенджамина",
        watering: "Регулярный без переувлажнения. Примерно 2 раза в неделю.",
        lighting: "Яркий свет без прямых солнечных лучей.",
        repotting: "Молодые каждый год, взрослые раз в 2-4 года.",
        toxicity: "Сок может вызвать раздражение кожи.",
        isToxic: true,
        features: "Не любит частые перестановки и сквозняки (может сбросить листья)."
    }
];

let myCollection = JSON.parse(localStorage.getItem('my_plant_collection')) || [];

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(btn => 
        btn.getAttribute('onclick').includes(pageId)
    );
    if(activeBtn) activeBtn.classList.add('active');

    if (pageId === 'catalog') renderCatalog();
    if (pageId === 'my-plants') renderCollection();
}

function renderCatalog() {
    const container = document.getElementById('catalog-list');
    container.innerHTML = '';

    plantCatalog.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${plant.name}</h3>
            <p><span class="label">Полив:</span> ${plant.watering}</p>
            <p><span class="label">Освещение:</span> ${plant.lighting}</p>
            <p><span class="label">Пересадка:</span> ${plant.repotting}</p>
            <p><span class="label">Особенности:</span> ${plant.features}</p>
            <p>
                <span class="badge ${plant.isToxic ? 'danger' : 'safe'}">
                    ${plant.toxicity}
                </span>
            </p>
            <button class="btn btn-primary" onclick="openAddToCollectionForm(${plant.id})">Добавить в личный список</button>
        `;
        container.appendChild(card);
    });
}

function openAddToCollectionForm(plantId) {
    const plant = plantCatalog.find(p => p.id === plantId);
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
    
    const plantData = plantCatalog.find(p => p.id === plantId);

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
    showToast(`Растение "${userPlant.name}" успешно добавлено!`);
}

function removeFromCollection(instanceId) {
    myCollection = myCollection.filter(item => item.instanceId !== instanceId);
    localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
    renderCollection();
    showToast("Растение удалено из коллекции");
}

function actionWater(instanceId) {
    const plant = myCollection.find(item => item.instanceId === instanceId);
    if (plant) {
        plant.lastWatered = new Date().toISOString();
        localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
        renderCollection();
        showToast(`Запись обновлена: "${plant.name}" полито!`);
    }
}

function actionRepot(instanceId) {
    const plant = myCollection.find(item => item.instanceId === instanceId);
    if (plant) {
        plant.lastRepotted = new Date().toISOString();
        localStorage.setItem('my_plant_collection', JSON.stringify(myCollection));
        renderCollection();
        showToast(`Запись обновлена: "${plant.name}" пересажено!`);
    }
}

function getDaysStatus(lastActionISO, intervalDays) {
    const lastAction = new Date(lastActionISO);
    const nextAction = new Date(lastAction.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
    const diffTime = nextAction - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getMonthsStatus(lastActionISO, intervalMonths) {
    const lastAction = new Date(lastActionISO);
    const nextAction = new Date(lastAction);
    nextAction.setMonth(nextAction.getMonth() + intervalMonths);
    const diffTime = nextAction - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function renderCollection() {
    const container = document.getElementById('my-plants-list');
    container.innerHTML = '';

    if (myCollection.length === 0) {
        container.innerHTML = '<p>Ваша коллекция пуста. Добавьте растения из справочника.</p>';
        return;
    }

    myCollection.forEach(plant => {
        const waterDaysLeft = getDaysStatus(plant.lastWatered, plant.waterInterval);
        const repotDaysLeft = getMonthsStatus(plant.lastRepotted, plant.repotInterval);

        let waterStatusText = waterDaysLeft > 0 ? `Через ${waterDaysLeft} дн.` : "Требуется полив!";
        let repotStatusText = repotDaysLeft > 0 ? `Через ${repotDaysLeft} дн.` : "Требуется пересадка!";

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${plant.name}</h3>
            <p><span class="label">Дата добавления:</span> ${plant.addedDate}</p>
            ${plant.notes ? `<p class="user-note"><span class="label">Заметка:</span> ${plant.notes}</p>` : ''}
            
            <p>
                <span class="label">Полив:</span> ${waterStatusText} 
                <button class="btn btn-secondary" style="padding: 3px 6px; font-size: 0.8rem; margin-left: 5px;" onclick="actionWater(${plant.instanceId})">Полил(а)</button>
            </p>
            
            <p>
                <span class="label">Пересадка:</span> ${repotStatusText}
                <button class="btn btn-secondary" style="padding: 3px 6px; font-size: 0.8rem; margin-left: 5px;" onclick="actionRepot(${plant.instanceId})">Пересадил(а)</button>
            </p>
            
            <button class="btn btn-danger" onclick="removeFromCollection(${plant.instanceId})">Удалить</button>
        `;
        container.appendChild(card);
    });
}

function checkNotifications() {
    let alerts = [];
    myCollection.forEach(plant => {
        const waterDaysLeft = getDaysStatus(plant.lastWatered, plant.waterInterval);
        const repotDaysLeft = getMonthsStatus(plant.lastRepotted, plant.repotInterval);

        if (waterDaysLeft <= 0) alerts.push(`Полить "${plant.name}"`);
        if (repotDaysLeft <= 0) alerts.push(`Пересадить "${plant.name}"`);
    });

    if (alerts.length > 0) {
        showToast(`Напоминание: ${alerts.slice(0, 2).join(', ')}${alerts.length > 2 ? ' и другие задачи...' : ''}`);
    }
}

function showToast(message) {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

renderCatalog();
setTimeout(checkNotifications, 1000);
