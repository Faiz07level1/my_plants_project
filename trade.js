import { showToast } from './utils.js';
import { userCollection, plantCatalog } from './data.js';

export async function renderTradeOffers() {
    const container = document.getElementById('trade-list');
    if (!container) return;
    container.innerHTML = '';

    try {
        const response = await fetch('/api/trade/offers');
        const offers = await response.json();
        const current_user = localStorage.getItem('current_user');

        if (offers.length === 0) {
            container.innerHTML = '<p>Объявлений пока нет.</p>';
            return;
        }

        offers.forEach(offer => {
            const card = document.createElement('div');
            card.className = 'trade-card';
            card.innerHTML = `
                <div>
                    <h3>🌱 Отдаёт: ${offer.plant} (${offer.giveQty || 1} шт.)</h3>
                    <p><strong>Владелец:</strong> ${offer.username}</p>
                    <p style="color: #059669; font-weight: 600;"><strong>Ищет взамен:</strong> ${offer.wants} (${offer.wantQty || 1} шт.)</p>
                </div>
                ${offer.username !== current_user 
                    ? `<button class="btn btn-primary" onclick="window.startChatWith('${offer.username}')">Обсудить обмен</button>` 
                    : `<button class="btn btn-danger" onclick="window.cancelTradeOffer(${offer.id})">Отменить объявление</button>`
                }
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
    }
}

export async function openCreateOfferModal() {
    const selectGive = document.getElementById('offer-plant-select');
    const selectWant = document.getElementById('offer-wants-select');
    const qtyInput = document.getElementById('offer-plant-qty');
    const label = document.getElementById('max-available-label');
    
    if (!selectGive || !selectWant || !qtyInput) return;
    
    selectGive.innerHTML = '<option value="">-- Выберите растение --</option>';
    selectWant.innerHTML = '<option value="">-- Выберите растение --</option>';

    plantCatalog.forEach(plant => {
        const option = document.createElement('option');
        option.value = plant.name;
        option.textContent = plant.name;
        selectWant.appendChild(option);
    });

    if (userCollection.length === 0) {
        selectGive.innerHTML = '<option value="">Ваша коллекция пуста!</option>';
        qtyInput.max = 0;
        qtyInput.value = 0;
        label.textContent = "(Добавьте цветы в коллекцию)";
        document.getElementById('offer-modal').style.display = 'flex';
        return;
    }

    let activeOffers = [];
    try {
        const response = await fetch('/api/trade/offers');
        if (response.ok) {
            activeOffers = await response.json();
        }
    } catch (e) {
        console.error(e);
    }

    const current_user = localStorage.getItem('current_user');
    const lockedQuantities = {};
    activeOffers.forEach(offer => {
        if (offer.username === current_user) {
            lockedQuantities[offer.plant] = (lockedQuantities[offer.plant] || 0) + (offer.giveQty || 0);
        }
    });

    const groupedCollection = {};
    userCollection.forEach(plant => {
        if (groupedCollection[plant.name]) {
            groupedCollection[plant.name].quantity += plant.quantity;
        } else {
            groupedCollection[plant.name] = {
                name: plant.name,
                quantity: plant.quantity
            };
        }
    });

    let hasAvailablePlants = false;
    Object.values(groupedCollection).forEach(plant => {
        const locked = lockedQuantities[plant.name] || 0;
        const available = plant.quantity - locked;

        if (available > 0) {
            const option = document.createElement('option');
            option.value = plant.name;
            option.textContent = `${plant.name} (доступно: ${available} шт.)`;
            selectGive.appendChild(option);
            hasAvailablePlants = true;
        }
    });

    if (!hasAvailablePlants) {
        selectGive.innerHTML = '<option value="">Все ваши растения уже выставлены на обмен!</option>';
        qtyInput.max = 0;
        qtyInput.value = 0;
        label.textContent = "(Нет свободных штук)";
    } else {
        qtyInput.value = 1;
        handleTradePlantChange();
    }

    document.getElementById('offer-modal').style.display = 'flex';
}

export async function handleTradePlantChange() {
    const select = document.getElementById('offer-plant-select');
    const qtyInput = document.getElementById('offer-plant-qty');
    const label = document.getElementById('max-available-label');
    
    if (!select || !qtyInput || !label) return;

    const plantName = select.value;
    if (!plantName) {
        qtyInput.max = 1;
        label.textContent = "";
        return;
    }
    
    let activeOffers = [];
    try {
        const response = await fetch('/api/trade/offers');
        if (response.ok) {
            activeOffers = await response.json();
        }
    } catch (e) {
        console.error(e);
    }

    const current_user = localStorage.getItem('current_user');
    let locked = 0;
    activeOffers.forEach(offer => {
        if (offer.username === current_user && offer.plant === plantName) {
            locked += (offer.giveQty || 0);
        }
    });

    let totalOwned = 0;
    userCollection.forEach(p => {
        if (p.name === plantName) {
            totalOwned += p.quantity;
        }
    });

    const available = totalOwned - locked;

    if (available > 0) {
        qtyInput.max = available;
        if (parseInt(qtyInput.value) > available) {
            qtyInput.value = available;
        }
        label.textContent = `(Доступно максимум: ${available} шт.)`;
    } else {
        qtyInput.max = 1;
        label.textContent = "";
    }
}

export function closeCreateOfferModal() {
    document.getElementById('offer-modal').style.display = 'none';
}

export async function handleCreateOffer(event) {
    event.preventDefault();
    const username = localStorage.getItem('current_user');
    const selectGive = document.getElementById('offer-plant-select');
    const selectWant = document.getElementById('offer-wants-select');
    
    if (!selectGive || !selectWant) return;

    let plantName = selectGive.value;
    if (!plantName && selectGive.selectedIndex >= 0) {
        plantName = selectGive.options[selectGive.selectedIndex].value;
    }

    if (!plantName || plantName.startsWith('--')) {
        showToast("Выберите растение из коллекции!");
        return;
    }

    const wants = selectWant.value;
    if (!wants || wants.startsWith('--')) {
        showToast("Выберите растение, которое хотите взамен!");
        return;
    }

    const giveQty = parseInt(document.getElementById('offer-plant-qty').value);
    const wantQty = parseInt(document.getElementById('offer-wants-qty').value);

    let activeOffers = [];
    try {
        const response = await fetch('/api/trade/offers');
        if (response.ok) {
            activeOffers = await response.json();
        }
    } catch (e) {
        console.error(e);
    }

    let locked = 0;
    activeOffers.forEach(offer => {
        if (offer.username === username && offer.plant === plantName) {
            locked += (offer.giveQty || 0);
        }
    });

    let totalOwned = 0;
    userCollection.forEach(p => {
        if (p.name === plantName) {
            totalOwned += p.quantity;
        }
    });

    const available = totalOwned - locked;

    if (giveQty > available || giveQty < 1) {
        showToast(`Вы не можете отдать больше доступного остатка (${available} шт.)!`);
        return;
    }

    try {
        const response = await fetch('/api/trade/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                plant: plantName, 
                giveQty, 
                wants, 
                wantQty 
            })
        });
        if (response.ok) {
            closeCreateOfferModal();
            showToast("Объявление успешно размещено!");
            renderTradeOffers();
        }
    } catch (e) {
        console.error(e);
    }
}

export async function cancelTradeOffer(offerId) {
    try {
        const response = await fetch(`/api/trade/offers/${offerId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showToast("Объявление успешно отменено!");
            renderTradeOffers();
        } else {
            showToast("Не удалось отменить объявление.");
        }
    } catch (e) {
        console.error(e);
        showToast("Ошибка соединения с сервером.");
    }
}






