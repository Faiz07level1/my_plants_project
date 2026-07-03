import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDB } from './server-modules/db.js';
import { initAuthRoutes } from './server-modules/auth-routes.js';
import { initUserRoutes } from './server-modules/user-routes.js';
import { initTradeRoutes } from './server-modules/trade-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/database', (req, res) => {
    const db = readDB();
    if (!db) return res.status(500).json({ error: "DB Read Error" });
    res.json(db);
});

initAuthRoutes(app);
initUserRoutes(app);
initTradeRoutes(app);

app.listen(PORT, () => {
    console.log(`Сервер запущен! Откройте браузер по адресу: http://localhost:${PORT}`);
});












