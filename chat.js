import { plantCatalog } from './data.js';
import { showToast } from './utils.js';

let currentChatPlantId = null;
let chatRefreshInterval = null;

export function renderChatSelect() {
    const container = document.getElementById('chat-select-list');
    if (!container) return;
    container.innerHTML = '';

    if (plantCatalog.length === 0) {
        container.innerHTML = '<p>Справочник растений пуст.</p>';
        return;
    }

    plantCatalog.forEach(function (plant) {
        const item = document.createElement('div');
        item.className = 'chat-select-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = plant.name;

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = '💬 Открыть чат';
        btn.addEventListener('click', function () {
            openPlantChat(plant.id);
        });

        item.appendChild(nameSpan);
        item.appendChild(btn);
        container.appendChild(item);
    });
}

export function openPlantChat(plantId) {
    currentChatPlantId = plantId;
    window.switchPage('chat');
}

export function renderChatPage() {
    const titleEl = document.getElementById('chat-plant-title');
    const plant = plantCatalog.find(function (p) { return p.id === currentChatPlantId; });

    if (titleEl) {
        titleEl.textContent = plant ? ('💬 ' + plant.name) : 'Обсуждение';
    }

    if (!currentChatPlantId) {
        window.switchPage('chat-select');
        return;
    }

    loadMessages();
    startAutoRefresh();
}

export function stopChatAutoRefresh() {
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
        chatRefreshInterval = null;
    }
}

function startAutoRefresh() {
    stopChatAutoRefresh();
    chatRefreshInterval = setInterval(loadMessages, 5000);
}

export async function loadMessages() {
    if (!currentChatPlantId) return;
    const container = document.getElementById('chat-messages');
    if (!container) return;

    try {
        const response = await fetch('/api/messages/' + currentChatPlantId);
        if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);
        const messages = await response.json();
        renderMessages(messages, container);
    } catch (error) {
        console.error('Не удалось загрузить сообщения:', error);
    }
}

function renderMessages(messages, container) {
    const wasScrolledToBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 20;

    container.innerHTML = '';

    if (!messages || messages.length === 0) {
        container.innerHTML = '<p class="chat-empty">Сообщений пока нет. Будьте первым!</p>';
        return;
    }

    messages.forEach(function (msg) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-message';

        const author = document.createElement('span');
        author.className = 'chat-author';
        author.textContent = msg.username + ': ';

        const text = document.createElement('span');
        text.className = 'chat-text';
        text.textContent = msg.message;

        const time = document.createElement('span');
        time.className = 'chat-time';
        time.textContent = formatTime(msg.createdAt);

        bubble.appendChild(author);
        bubble.appendChild(text);
        bubble.appendChild(time);
        container.appendChild(bubble);
    });

    if (wasScrolledToBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

function formatTime(isoString) {
    try {
        return new Date(isoString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '';
    }
}

export async function sendChatMessage(event) {
    event.preventDefault();

    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const username = localStorage.getItem('current_user');
    if (!username) {
        showToast('Сначала войдите в систему');
        return;
    }

    if (!currentChatPlantId) {
        showToast('Не выбрано растение для чата');
        return;
    }

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plantId: currentChatPlantId,
                username: username,
                message: text
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(function () { return {}; });
            throw new Error(errData.error || 'Ошибка отправки сообщения');
        }

        input.value = '';
        await loadMessages();
    } catch (error) {
        console.error(error);
        showToast('Не удалось отправить сообщение');
    }
}
