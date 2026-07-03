import { readDB, writeDB } from './db.js';

export function initAuthRoutes(app) {
    app.post('/api/auth/login', (req, res) => {
        const { username, password } = req.body;
        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });
        
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
        if (!db) return res.status(500).json({ error: "DB Read Error" });
        
        db.users = db.users || [];
        const isExist = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());

        if (isExist) {
            return res.status(400).json({ success: false, message: "Этот никнейм уже занят" });
        }

        const newUser = { id: Date.now(), username, password };
        db.users.push(newUser);
        
        if (writeDB(db)) {
            res.json({ success: true, username: newUser.username });
        } else {
            res.status(500).json({ success: false, message: "Ошибка сохранения на сервере" });
        }
    });
}
