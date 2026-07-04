
import { userCollection } from './data.js';
import { showToast } from './utils.js';

let activeTradeTab = 'all'; // 'all' | 'mine' | 'incoming'

function getUsername() {
    return localStorage.getItem('current_user') || '';
}

export async function renderTradeOffers() {
    const container = document.getElementById('trade-offers-list');
    if (!container) return;

    try {
        const response = await fetch('/api/trade/offers');
        const offers = await response.json();

        const username = getUsername();

        let filtered = offers;
        if (activeTradeTab === 'mine') {
            filtered = offers.filter(function (o) { return o.fromUsername === username; });
        } else if (activeTradeTab === 'incoming') {
            filtered = offers.filter(function (o) {
                return o.toUsername === username || (o.toUsername === null && o.fromUsername !== username);
            });
        }

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = '<p style="color:var(--color-card-text-muted);">Нет предложений.</p>';
            return;
        }

        filtered.forEach(function (offer) {
            const card = document.createElement('div');
            card.className = 'trade-offer-card';

            const statusClass = offer.status === 'pending' ? 'pending' : offer.status === 'accepted' ? 'accepted' : 'declined';
            const statusText = offer.status === 'pending' ? 'Ожидание' : offer.status === 'accepted' ? 'Принято' : 'Отклонено';
            const directionText = offer.toUsername ? '→ ' + offer.toUsername : '(открытое)';

            const isMyOffer = offer.fromUsername === username;
            const canAcceptOrDecline = !isMyOffer && offer.status === 'pending' &&
                (offer.toUsername === null || offer.toUsername === username);

            let actionsHtml = '';
            if (canAcceptOrDecline) {
                actionsHtml =
                    '<div class="trade-offer-actions">' +
                        '<button class="btn btn-primary btn-accept-trade" data-id="' + offer.id + '">Принять</button>' +
                        '<button class="btn btn-danger btn-decline-trade" data-id="' + offer.id + '">Отклонить</button>' +
                    '</div>';
            } else if (isMyOffer && offer.status === 'pending') {
                actionsHtml =
                    '<div class="trade-offer-actions">' +
                        '<button class="btn btn-secondary btn-cancel-trade" data-id="' + offer.id + '">Отменить</button>' +
                    '</div>';
            }

            card.innerHTML =
                '<div class="trade-offer-info">' +
                    '<h3>🌱 ' + escapeHtml(offer.fromPlantName) + '</h3>' +
                    '<p>От: <strong>' + escapeHtml(offer.fromUsername) + '</strong> ' + escapeHtml(directionText) + '</p>' +
                    (offer.comment ? '<p>💬 ' + escapeHtml(offer.comment) + '</p>' : '') +
                    '<p><span class="trade-status ' + statusClass + '">' + statusText + '</span></p>' +
                '</div>' +
                actionsHtml;

            // Обработчики кнопок
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('btn-accept-trade')) {
                    handleTradeAction(parseInt(e.target.getAttribute('data-id')), 'accepted');
                } else if (e.target.classList.contains('btn-decline-trade')) {
                    handleTradeAction(parseInt(e.target.getAttribute('data-id')), 'declined');
                } else if (e.target.classList.contains('btn-cancel-trade')) {
                    handleCancelTrade(parseInt(e.target.getAttribute('data-id')));
                }
            });

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Ошибка загрузки предложений обмена:', error);
        container.innerHTML = '<p>Не удалось загрузить предложения.</p>';
    }
}


export function setTradeTab(tabId) {
    activeTradeTab = tabId;
    document.querySelectorAll('[data-trade-tab]').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-trade-tab') === tabId);
    });
    renderTradeOffers();
}


export function openTradeOfferModal() {
    const select = document.getElementById('trade-offer-plant-select');
    if (select) {
        select.innerHTML = '';
        userCollection.forEach(function (plant) {
            const opt = document.createElement('option');
            opt.value = plant.instanceId;
            opt.textContent = plant.name;
            opt.setAttribute('data-name', plant.name);
            select.appendChild(opt);
        });
        if (userCollection.length === 0) {
            select.innerHTML = '<option disabled>Ваша коллекция пуста</option>';
        }
    }

    document.getElementById('trade-offer-target').value = '';
    document.getElementById('trade-offer-comment').value = '';
    document.getElementById('trade-offer-modal').style.display = 'flex';
}

export function closeTradeOfferModal() {
    document.getElementById('trade-offer-modal').style.display = 'none';
}

export async function submitTradeOffer() {
    const select = document.getElementById('trade-offer-plant-select');
    const target = document.getElementById('trade-offer-target').value.trim();
    const comment = document.getElementById('trade-offer-comment').value.trim();

    if (!select || !select.value) {
        showToast('Выберите растение для обмена');
        return;
    }

    const selectedOption = select.options[select.selectedIndex];
    const plantName = selectedOption.getAttribute('data-name') || selectedOption.textContent;
    const username = getUsername();

    try {
        const response = await fetch('/api/trade/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUsername: username,
                fromPlantInstanceId: parseInt(select.value),
                fromPlantName: plantName,
                toUsername: target || null,
                comment: comment
            })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            closeTradeOfferModal();
            showToast('Предложение обмена отправлено!');
            renderTradeOffers();
        } else {
            showToast(result.error || 'Ошибка отправки предложения');
        }
    } catch (error) {
        showToast('Не удалось отправить предложение');
    }
}


async function handleTradeAction(offerId, status) {
    const username = getUsername();
    try {
        const response = await fetch('/api/trade/offers/' + offerId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status, username: username })
        });
        const result = await response.json();
        if (response.ok) {
            showToast(status === 'accepted' ? 'Предложение принято!' : 'Предложение отклонено');
            renderTradeOffers();
        } else {
            showToast(result.error || 'Ошибка');
        }
    } catch (error) {
        showToast('Ошибка');
    }
}

async function handleCancelTrade(offerId) {
    const username = getUsername();
    if (!confirm('Отменить предложение обмена?')) return;

    try {
        await fetch('/api/trade/offers/' + offerId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });
        showToast('Предложение отменено');
        renderTradeOffers();
    } catch (error) {
        showToast('Ошибка');
    }
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
