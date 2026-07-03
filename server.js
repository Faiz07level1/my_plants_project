import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(express.json());
app.use(express.static(__dirname));

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { catalog: [], users: [], collections: {}, favorites: {}, tradeOffers: [], chats: {} };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

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

app.listen(PORT, () => {
    console.log(`Сервер запущен! Откройте браузер по адресу: http://localhost:${PORT}`);
});



