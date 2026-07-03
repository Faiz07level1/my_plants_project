const API_URL = 'http://localhost:3000/api';

const ServerMock = {
    async loadAllData() {
        try {
            const response = await fetch(`${API_URL}/get-all`);
            return await response.json();
        } catch (e) {
            console.error(e);
            return { catalog: [], users: [], collections: {}, tradeOffers: [], chats: {} };
        }
    },

    async login(username) {
        try {
            const response = await fetch(`${API_URL}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            return await response.json();
        } catch (e) {
            console.error(e);
        }
    },

    async saveCollection(username, collection) {
        try {
            await fetch(`${API_URL}/save-collection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, collection })
            });
        } catch (e) {
            console.error(e);
        }
    },

    async saveTradeOffers(offers) {
        try {
            await fetch(`${API_URL}/save-trades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offers)
            });
        } catch (e) {
            console.error(e);
        }
    },

    async saveChatMessages(offerId, messages) {
        try {
            await fetch(`${API_URL}/chat/${offerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messages)
            });
        } catch (e) {
            console.error(e);
        }
    }
};



