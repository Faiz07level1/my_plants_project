let currentChatOfferId = null;
let chatInterval = null;

function openCreateTradeForm() {
    const select = document.getElementById('trade-my-plant');
    select.innerHTML = '';
    
    if (myCollection.length === 0) {
        showToast("В вашей личной коллекции нет растений для обмена.");
        return;
    }
    
    myCollection.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
    
    switchPage('create-trade-page');
}

async function saveTradeOffer(event) {
    event.preventDefault();
    const plantName = document.getElementById('trade-my-plant').value;
    const preferences = document.getElementById('trade-preferences').value;
    
    const serverData = await ServerMock.loadAllData();
    const offers = serverData.tradeOffers || [];
    
    offers.push({
        id: Date.now(),
        user: currentUser,
        plantName: plantName,
        preferences: preferences
    });
    
    await ServerMock.saveTradeOffers(offers);
    switchPage('trade');
    renderTradeOffers();
    showToast("Растение выставлено в общую ленту!");
}

async function renderTradeOffers() {
    const container = document.getElementById('trade-list');
    container.innerHTML = '';
    
    const serverData = await ServerMock.loadAllData();
    const offers = serverData.tradeOffers || [];
    
    offers.forEach(offer => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${offer.plantName}</h3>
            <p><span class="label">Отдал:</span> @${offer.user}</p>
            <p><span class="label">Хочет взамен:</span> ${offer.preferences}</p>
            ${offer.user !== currentUser ? `<button class="btn btn-secondary" onclick="openChat(${offer.id}, '${offer.user}', '${offer.plantName}')">Начать обмен (Открыть чат)</button>` : '<span class="badge safe">Ваше объявление</span>'}
        `;
        container.appendChild(card);
    });
}

async function openChat(offerId, ownerUser, plantName) {
    currentChatOfferId = offerId;
    document.getElementById('chat-window').style.display = 'block';
    document.getElementById('chat-title').textContent = `Обмен с @${ownerUser}`;
    
    if (chatInterval) clearInterval(chatInterval);
    
    await updateChatMessages();
    chatInterval = setInterval(updateChatMessages, 3000);
}

async function updateChatMessages() {
    if (!currentChatOfferId) return;
    const serverData = await ServerMock.loadAllData();
    const messages = serverData.chats[currentChatOfferId] || [];
    renderChatMessages(messages);
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    messages.forEach(m => {
        const div = document.createElement('div');
        const isMe = m.sender === currentUser;
        div.className = `chat-msg ${isMe ? 'me' : 'other'}`;
        div.innerHTML = `<strong>@${m.sender}:</strong> ${m.text}`;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !currentChatOfferId) return;
    
    const serverData = await ServerMock.loadAllData();
    const messages = serverData.chats[currentChatOfferId] || [];
    
    messages.push({ sender: currentUser, text: text });
    await ServerMock.saveChatMessages(currentChatOfferId, messages);
    
    input.value = '';
    renderChatMessages(messages);
}

