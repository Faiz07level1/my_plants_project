import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadEnv } from './env.js';
import { readDB, writeDB, ROOT_DIR } from './db.js';

import { messengerRouter } from './routes/messenger.js';
import { tradeRouter } from './routes/trade.js';
import { recognizeRouter } from './routes/recognize.js';
import { trefleRouter } from './routes/trefle.js';
import { catalogPhotoRouter } from './routes/catalogPhoto.js';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '15mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/messenger', messengerRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/recognize', recognizeRouter);
app.use('/api/trefle', trefleRouter);
app.use('/api/catalog', catalogPhotoRouter);


app.get('/api/database', (req, res) => {
    res.json(readDB());
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const users = db.users || [];

    const userFound = users.find(u => u.username === username && u.password === password);

    if (userFound) {
        res.json({ success: true, username: userFound.username });
    } else {
        res.status(401).json({ success: false, message: "Неверное имя пользователя или пароль" });
    }
});

app.post('/api/auth/signup', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    db.users = db.users || [];

    const isExist = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());

    if (isExist) {
        return res.status(400).json({ success: false, message: "Этот никнейм уже занят" });
    }

    const newUser = {
        id: Date.now(),
        username,
        password
    };

    db.users.push(newUser);
    writeDB(db);

    res.json({ success: true, username: newUser.username });
});

app.get('/api/user/data', (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const db = readDB();
    db.collections = db.collections || {};
    db.favorites = db.favorites || {};

    res.json({
        collection: db.collections[username] || [],
        favorites: db.favorites[username] || []
    });
});

app.post('/api/user/collection', (req, res) => {
    const { username, collection } = req.body;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const db = readDB();
    db.collections = db.collections || {};
    db.collections[username] = collection;
    writeDB(db);

    res.json({ success: true });
});

app.post('/api/user/favorites', (req, res) => {
    const { username, favorites } = req.body;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const db = readDB();
    db.favorites = db.favorites || {};
    db.favorites[username] = favorites;
    writeDB(db);

    res.json({ success: true });
});

app.get('/api/messages/:plantId', (req, res) => {
    try {
        const plantId = req.params.plantId;
        const db = readDB();
        db.chats = db.chats || {};
        const messages = db.chats[plantId] || [];
        res.json(messages);
    } catch (error) {
        console.error('Ошибка получения сообщений:', error);
        res.status(500).json({ error: 'Не удалось получить сообщения' });
    }
});

app.post('/api/messages', (req, res) => {
    try {
        const { plantId, username, message } = req.body;

        if (!plantId || !username || !message) {
            return res.status(400).json({ error: 'Не хватает данных: обязательны plantId, username и message' });
        }

        const text = String(message).trim();
        if (!text) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }

        const db = readDB();
        db.chats = db.chats || {};
        db.chats[plantId] = db.chats[plantId] || [];

        const newMessage = {
            id: Date.now(),
            username: String(username),
            message: text,
            createdAt: new Date().toISOString()
        };

        db.chats[plantId].push(newMessage);
        writeDB(db);

        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        res.status(500).json({ error: 'Не удалось отправить сообщение' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен! Откройте браузер по адресу: http://localhost:${PORT}`);
    if (!process.env.TREFLE_API_KEY) {
        console.warn('⚠️  TREFLE_API_KEY не задан — поиск в Trefle и seed-plants.js работать не будут. Проверьте файл .env');
    }
    if (!process.env.PLANT_ID_API_KEY) {
        console.warn('⚠️  PLANT_ID_API_KEY не задан — распознавание растений по фото работать не будет. Проверьте файл .env');
    }
});
