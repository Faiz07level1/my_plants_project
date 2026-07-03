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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/database', (req, res) => {
    const db = readDB();
    if (!db) return res.status(500).json({ error: "DB Read Error" });
    res.json(db);
});

app.post('/api/recognize', (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, message: "No image provided" });

    const db = readDB();
    if (!db || !db.catalog || db.catalog.length === 0) {
        return res.status(500).json({ success: false, message: "Catalog empty" });
    }

    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * db.catalog.length);
        const recognizedPlant = db.catalog[randomIndex];

        res.json({
            success: true,
            plantId: recognizedPlant.id,
            plantName: recognizedPlant.name
        });
    }, 1200); 
});

initAuthRoutes(app);
initUserRoutes(app);
initTradeRoutes(app);

app.listen(PORT, () => {
    console.log(`Сервер запущен! Откройте браузер по адресу: http://localhost:${PORT}`);
});















