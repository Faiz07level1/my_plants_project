let plantCatalog = [];
let myCollection = [];
let currentUser = localStorage.getItem('plant_user') || null;

async function handleAuth() {
    const input = document.getElementById('auth-username');
    if (!input) return;
    
    const username = input.value.trim().replace('@', '');
    if (!username) return;

    try {
        const res = await ServerMock.login(username);
        currentUser = username;
        localStorage.setItem('plant_user', currentUser);
        showInterface();
    } catch(err) {
        console.warn("Сервер не ответил, вход выполнен в локальном режиме", err);
        currentUser = username;
        localStorage.setItem('plant_user', currentUser);
        showInterface();
    }
}

function showInterface() {
    const authScreen = document.getElementById('auth-screen');
    const appInterface = document.getElementById('app-interface');
    const badge = document.getElementById('user-badge');

    if (authScreen) authScreen.style.style.display = 'none';
    if (appInterface) appInterface.style.style.display = 'flex';
    if (badge) badge.textContent = `Вы вошли как: @${currentUser}`;
    
    initApp();
}

function handleLogout() {
    localStorage.removeItem('plant_user');
    if (typeof chatInterval !== 'undefined' && chatInterval) clearInterval(chatInterval);
    location.reload();
}

async function initApp() {
    if (!currentUser) return;
    try {
        const serverData = await ServerMock.loadAllData();
        plantCatalog = serverData.catalog || [];
        myCollection = serverData.collections[currentUser] || [];
    } catch(e) {
        plantCatalog = [
            { id: 1, name: "Монстера", watering: "Каждые 7 дней", lighting: "Рассеянный свет", repotting: "Раз в 2 года", isToxic: true, toxicity: "Ядовито" },
            { id: 2, name: "Сансевиерия", watering: "Раз в 3 недели", lighting: "Неприхотлива", repotting: "Раз в 4 года", isToxic: false, toxicity: "Безопасно" }
        ];
        myCollection = [];
    }
    renderCatalog();
}

function switchPage(pageId) {
    if (typeof chatInterval !== 'undefined' && chatInterval && pageId !== 'trade') {
        clearInterval(chatInterval);
        const chatWin = document.getElementById('chat-window');
        if (chatWin) chatWin.style.style.display = 'none';
    }

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(pageId)
    );
    if (activeBtn) activeBtn.classList.add('active');

    if (pageId === 'catalog') renderCatalog();
    if (pageId === 'my-plants') renderCollection();
    if (pageId === 'recommendations') typeof renderRecommendations === 'function' && renderRecommendations();
    if (pageId === 'trade') typeof renderTradeOffers === 'function' && renderTradeOffers();
}

function renderCatalog() {
    const container = document.getElementById('catalog-list');
    if (!container) return;
    container.innerHTML = '';

    plantCatalog.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${plant.name}</h3>
            <p><span class="label">Полив:</span> ${plant.watering}</p>
            <p><span class="label">Освещение:</span> ${plant.lighting}</p>
            <p><span class="badge ${plant.isToxic ? 'danger' : 'safe'}">${plant.isToxic ? 'Ядовито' : 'Безопасно'}</span></p>
            <button class="btn btn-primary" onclick="openAddToCollectionForm(${plant.id})">Добавить в коллекцию</button>
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

async function saveToCollection(event) {
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
        repottingInterval: repotInterval,
        lastWatered: new Date().toISOString(),
        lastRepotted: new Date().toISOString()
    };

    myCollection.push(userPlant);
    try {
        await ServerMock.saveCollection(currentUser, myCollection);
    } catch(e) {}
    
    switchPage('my-plants');
    showToast(`Растение добавлено в вашу личную коллекцию!`);
}

async function removeFromCollection(instanceId) {
    myCollection = myCollection.filter(item => item.instanceId !== instanceId);
    try {
        await ServerMock.saveCollection(currentUser, myCollection);
    } catch(e) {}
    renderCollection();
}

async function actionWater(instanceId) {
    const plant = myCollection.find(item => item.instanceId === instanceId);
    if (plant) {
        plant.lastWatered = new Date().toISOString();
        try {
            await ServerMock.saveCollection(currentUser, myCollection);
        } catch(e) {}
        renderCollection();
    }
}

async function actionRepot(instanceId) {
    const plant = myCollection.find(item => item.instanceId === instanceId);
    if (plant) {
        plant.lastRepotted = new Date().toISOString();
        try {
            await ServerMock.saveCollection(currentUser, myCollection);
        } catch(e) {}
        renderCollection();
    }
}

function renderCollection() {
    const container = document.getElementById('my-plants-list');
    if (!container) return;
    container.innerHTML = '';

    if (myCollection.length === 0) {
        container.innerHTML = '<p>Ваша коллекция пуста.</p>';
        return;
    }

    myCollection.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${plant.name}</h3>
            ${plant.notes ? `<p class="user-note">${plant.notes}</p>` : ''}
            <button class="btn btn-secondary" onclick="actionWater(${plant.instanceId})">Отметить полив</button>
            <button class="btn btn-danger" onclick="removeFromCollection(${plant.instanceId})">Удалить</button>
        `;
        container.appendChild(card);
    });
}

function showToast(message) {
    const toast = document.getElementById('notification-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.style.display = 'block';
    setTimeout(() => toast.style.style.display = 'none', 4000);
}

if (currentUser) {
    showInterface();
}


