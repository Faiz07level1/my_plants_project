import { switchPage } from './navigation.js';
import { showToast } from './utils.js';
import { syncUserDataFromServer } from './data.js';

let activeChatId = null;

export async function renderChats() {
    const listContainer = document.getElementById('chats-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const username = localStorage.getItem('current_user');

    try {
        const response = await fetch(`/api/chats?username=${encodeURIComponent(username)}`);
        const chats = await response.json();

        const chatIds = Object.keys(chats);
        if (chatIds.length === 0) {
            listContainer.innerHTML = '<p style="font-size:0.85rem;color:#6b7280;">Нет активных чатов.</p>';
            document.getElementById('chat-trade-bar').innerHTML = '';
            return;
        }

        chatIds.forEach(chatId => {
            const interlocutor = chatId.replace(username, '').replace('-', '');
            const tab = document.createElement('div');
            tab.className = `chat-tab ${chatId === activeChatId ? 'active' : ''}`;
            tab.textContent = interlocutor;
            tab.onclick = () => selectChat(chatId, interlocutor);
            listContainer.appendChild(tab);
        });

        if (activeChatId && chats[activeChatId]) {
            displayMessages(chats[activeChatId]);
            await updateChatTradeBar(activeChatId);
        }
    } catch (e) {
        console.error(e);
    }
}

function displayMessages(messages) {
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '';
    const username = localStorage.getItem('current_user');

    messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `msg-bubble ${msg.sender === username ? 'my' : 'other'}`;
        bubble.textContent = msg.text;
        msgContainer.appendChild(bubble);
    });
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function updateChatTradeBar(chatId) {
    const bar = document.getElementById('chat-trade-bar');
    if (!bar) return;
    bar.innerHTML = '';

    try {
        const response = await fetch('/api/trade/offers');
        const offers = await response.json();
        
        const participants = chatId.split('-');
        const current_user = localStorage.getItem('current_user');
        const interlocutor = participants.find(p => p !== current_user);
        
        const activeOffer = offers.find(o => 
            o.username === current_user && participants.includes(o.username) && chatId.includes(interlocutor) ||
            o.username === interlocutor && participants.includes(o.username) && chatId.includes(current_user)
        );

        if (activeOffer) {
            const isOwner = activeOffer.username === current_user;
            
            bar.innerHTML = `
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.85rem; color: #065f46;">
                        <strong>Предмет обсуждения:</strong> Обмен ${activeOffer.plant} (${activeOffer.giveQty} шт.) на ${activeOffer.wants} (${activeOffer.wantQty} шт.)
                    </div>
                    ${isOwner ? `
                        <button class="btn btn-primary" onclick="window.executeTrade(${activeOffer.id}, '${interlocutor}')" style="width: auto; padding: 6px 16px; font-size: 0.8rem;">
                            ✅ Дать добро на обмен
                        </button>
                    ` : `
                        <div style="font-size: 0.8rem; color: #047857; font-style: italic;">Ожидание согласия владельца...</div>
                    `}
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
    }
}

export async function executeTrade(offerId, buyerUsername) {
    try {
        const response = await fetch('/api/trade/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offerId, buyer: buyerUsername })
        });

        const result = await response.json();

        if (response.ok) {
            showToast("🎉 Сделка успешно проведена! Растения обновлены.");
            document.getElementById('chat-trade-bar').innerHTML = '';
            
            await syncUserDataFromServer(); 
            
            const { renderCollection } = await import('./collection.js');
            const { renderTradeOffers } = await import('./trade.js');
            
            renderCollection();
            renderTradeOffers();
            
            await renderChats();
        } else {
            showToast(result.error || "Ошибка проведения сделки");
        }
    } catch (e) {
        console.error(e);
        showToast("Ошибка связи с сервером");
    }
}


export async function selectChat(chatId, interlocutor) {
    activeChatId = chatId;
    document.getElementById('chat-header').textContent = `Чат с ${interlocutor}`;
    document.getElementById('chat-input').disabled = false;
    document.querySelector('#chat-form button').disabled = false;
    await renderChats();
}

export async function startChatWith(ownerName) {
    const current_user = localStorage.getItem('current_user');
    const chatId = [current_user, ownerName].sort().join('-');
    activeChatId = chatId;
    switchPage('chats-page');
    await selectChat(chatId, ownerName);
}

export async function handleSendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !activeChatId) return;

    const sender = localStorage.getItem('current_user');

    try {
        const response = await fetch('/api/chats/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeChatId, sender, text })
        });
        if (response.ok) {
            input.value = '';
            await renderChats();
        }
    } catch (e) {
        console.error(e);
    }
}



