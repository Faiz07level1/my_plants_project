import express from 'express';
import { readDB, writeDB } from '../db.js';

export const tradeRouter = express.Router();

tradeRouter.get('/offers', function (req, res) {
    const db = readDB();
    const offers = (db.tradeOffers || []).slice().sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    res.json(offers);
});

tradeRouter.post('/offers', function (req, res) {
    try {
        const { fromUsername, fromPlantInstanceId, fromPlantName, toUsername, comment } = req.body;

        if (!fromUsername || !fromPlantInstanceId || !fromPlantName) {
            return res.status(400).json({ error: 'Не хватает данных о предлагаемом растении' });
        }

        const db = readDB();
        db.tradeOffers = db.tradeOffers || [];

        const newOffer = {
            id: Date.now(),
            fromUsername: String(fromUsername),
            fromPlantInstanceId: fromPlantInstanceId,
            fromPlantName: String(fromPlantName),
            toUsername: toUsername ? String(toUsername) : null,
            comment: comment ? String(comment).trim() : '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        db.tradeOffers.push(newOffer);
        writeDB(db);

        res.json({ success: true, offer: newOffer });
    } catch (error) {
        console.error('Ошибка создания предложения обмена:', error);
        res.status(500).json({ error: 'Не удалось создать предложение' });
    }
});

tradeRouter.patch('/offers/:id', function (req, res) {
    const offerId = Number(req.params.id);
    const { status, username } = req.body;

    if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'Недопустимый статус' });
    }

    const db = readDB();
    db.tradeOffers = db.tradeOffers || [];
    const offer = db.tradeOffers.find(function (o) { return o.id === offerId; });

    if (!offer) return res.status(404).json({ error: 'Предложение не найдено' });

    if (offer.toUsername && offer.toUsername !== username) {
        return res.status(403).json({ error: 'Это предложение адресовано другому пользователю' });
    }
    if (offer.fromUsername === username) {
        return res.status(403).json({ error: 'Нельзя принять/отклонить собственное предложение' });
    }

    offer.status = status;
    offer.resolvedBy = username;
    offer.resolvedAt = new Date().toISOString();
    writeDB(db);

    res.json({ success: true, offer: offer });
});

tradeRouter.delete('/offers/:id', function (req, res) {
    const offerId = Number(req.params.id);
    const { username } = req.body;

    const db = readDB();
    db.tradeOffers = db.tradeOffers || [];
    const offer = db.tradeOffers.find(function (o) { return o.id === offerId; });

    if (!offer) return res.status(404).json({ error: 'Предложение не найдено' });
    if (offer.fromUsername !== username) {
        return res.status(403).json({ error: 'Можно удалять только свои предложения' });
    }

    db.tradeOffers = db.tradeOffers.filter(function (o) { return o.id !== offerId; });
    writeDB(db);

    res.json({ success: true });
});
