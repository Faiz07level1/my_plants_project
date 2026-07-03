import { readDB, writeDB } from './db.js';

export function initTradeRoutes(app) {
    app.get('/api/trade/offers', (req, res) => {
        const db = readDB();
        res.json(db.tradeOffers || []);
    });

    app.post('/api/trade/offers', (req, res) => {
        const { username, plant, giveQty, wants, wantQty } = req.body;
        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });
        
        db.tradeOffers = db.tradeOffers || [];

        const newOffer = { 
            id: Date.now(), 
            username: username, 
            plant: plant, 
            giveQty: Number(giveQty) || 1, 
            wants: wants, 
            wantQty: Number(wantQty) || 1 
        };
        db.tradeOffers.push(newOffer);
        
        if (writeDB(db)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Save Error" });
        }
    });

    app.delete('/api/trade/offers/:id', (req, res) => {
        const offerId = parseInt(req.params.id);
        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });

        db.tradeOffers = db.tradeOffers || [];
        db.tradeOffers = db.tradeOffers.filter(offer => offer.id !== offerId);

        if (writeDB(db)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Save Error" });
        }
    });

    app.post('/api/trade/execute', (req, res) => {
        const { offerId, buyer } = req.body;
        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });

        db.tradeOffers = db.tradeOffers || [];
        db.collections = db.collections || {};

        const offerIndex = db.tradeOffers.findIndex(o => o.id === parseInt(offerId));
        if (offerIndex === -1) return res.status(404).json({ error: "Объявление не найдено" });

        const offer = db.tradeOffers[offerIndex];
        const owner = offer.username; 

        db.collections[owner] = db.collections[owner] || [];
        db.collections[buyer] = db.collections[buyer] || [];

        let ownerPlant = db.collections[owner].find(p => p.name === offer.plant);
        const ownerQty = ownerPlant ? (Number(ownerPlant.quantity) || 1) : 0;
        if (!ownerPlant || ownerQty < offer.giveQty) {
            return res.status(400).json({ error: `У владельца недостаточно растений ${offer.plant} (в наличии: ${ownerQty}, требуется: ${offer.giveQty})` });
        }

        let buyerPlant = db.collections[buyer].find(p => p.name === offer.wants);
        const buyerQty = buyerPlant ? (Number(buyerPlant.quantity) || 1) : 0;
        if (!buyerPlant || buyerQty < offer.wantQty) {
            return res.status(400).json({ error: `У покупателя недостаточно растений ${offer.wants} для обмена! (в наличии: ${buyerQty}, требуется: ${offer.wantQty})` });
        }

        ownerPlant.quantity = ownerQty - offer.giveQty;
        if (ownerPlant.quantity <= 0) {
            db.collections[owner] = db.collections[owner].filter(p => p.name !== offer.plant);
        }

        buyerPlant.quantity = buyerQty - offer.wantQty;
        if (buyerPlant.quantity <= 0) {
            db.collections[buyer] = db.collections[buyer].filter(p => p.name !== offer.wants);
        }

        let ownerReceivedPlant = db.collections[owner].find(p => p.name === offer.wants);
        if (ownerReceivedPlant) {
            ownerReceivedPlant.quantity = (Number(ownerReceivedPlant.quantity) || 1) + offer.wantQty;
        } else {
            db.collections[owner].push({
                instanceId: Date.now() + 1,
                catalogId: 0,
                name: offer.wants,
                addedDate: new Date().toLocaleDateString('ru-RU'),
                notes: "Получено по обмену",
                waterIntervalMinutes: 10080,
                repotIntervalMinutes: 43200,
                lastWatered: new Date().toISOString(),
                lastRepotted: new Date().toISOString(),
                quantity: offer.wantQty
            });
        }

        let buyerReceivedPlant = db.collections[buyer].find(p => p.name === offer.plant);
        if (buyerReceivedPlant) {
            buyerReceivedPlant.quantity = (Number(buyerReceivedPlant.quantity) || 1) + offer.giveQty;
        } else {
            db.collections[buyer].push({
                instanceId: Date.now() + 2,
                catalogId: 0,
                name: offer.plant,
                addedDate: new Date().toLocaleDateString('ru-RU'),
                notes: "Получено по обмену",
                waterIntervalMinutes: 10080,
                repotIntervalMinutes: 43200,
                lastWatered: new Date().toISOString(),
                lastRepotted: new Date().toISOString(),
                quantity: offer.giveQty
            });
        }

        db.tradeOffers.splice(offerIndex, 1);

        if (writeDB(db)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Save Error" });
        }
    });

    app.get('/api/chats', (req, res) => {
        const username = req.query.username;
        const db = readDB();
        const userChats = {};
        
        Object.keys(db.chats || {}).forEach(chatId => {
            if (chatId.includes(username)) {
                userChats[chatId] = db.chats[chatId];
            }
        });
        res.json(userChats);
    });

    app.post('/api/chats/message', (req, res) => {
        const { chatId, sender, text } = req.body;
        const db = readDB();
        db.chats = db.chats || {};
        db.chats[chatId] = db.chats[chatId] || [];

        db.chats[chatId].push({ sender, text, timestamp: Date.now() });
        writeDB(db);
        res.json({ success: true });
    });
}
