import { readDB, writeDB } from './db.js';

export function initUserRoutes(app) {
    app.get('/api/user/data', (req, res) => {
        const username = req.query.username;
        if (!username) return res.status(400).json({ error: "Missing username" });

        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });
        
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
        if (!db) return res.status(500).json({ error: "DB Read Error" });
        
        db.collections = db.collections || {};
        db.collections[username] = collection;
        
        if (writeDB(db)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Save Error" });
        }
    });

    app.post('/api/user/favorites', (req, res) => {
        const { username, favorites } = req.body;
        if (!username) return res.status(400).json({ error: "Missing username" });

        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });
        
        db.favorites = db.favorites || {};
        db.favorites[username] = favorites;
        
        if (writeDB(db)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Save Error" });
        }
    });

    app.get('/api/recommendations', (req, res) => {
        const username = req.query.username;
        if (!username) return res.status(400).json({ error: "Missing username" });

        const db = readDB();
        if (!db) return res.status(500).json({ error: "DB Read Error" });

        const catalog = db.catalog || [];
        db.collections = db.collections || {};
        const userCollection = db.collections[username] || [];

        if (catalog.length === 0) return res.json([]);

        const ownedNames = userCollection.map(p => p.name);
        const availableOptions = catalog.filter(p => !ownedNames.includes(p.name));

        if (availableOptions.length === 0) return res.json([]);
        if (userCollection.length === 0) return res.json([availableOptions]);

        const hasToxicOwned = userCollection.some(p => {
            const catItem = catalog.find(c => c.name === p.name);
            return catItem ? catItem.isToxic : false;
        });

        let bestMatch = null;
        let maxScore = -1;

        availableOptions.forEach(plant => {
            let score = 0;

            if (!hasToxicOwned && !plant.isToxic) {
                score += 3;
            }

            const lightingMatch = userCollection.some(p => {
                const catItem = catalog.find(c => c.name === p.name);
                return catItem && catItem.lighting.substring(0, 10) === plant.lighting.substring(0, 10);
            });
            if (!lightingMatch) score += 1;

            const wateringMatch = userCollection.some(p => {
                const catItem = catalog.find(c => c.name === p.name);
                return catItem && catItem.watering.substring(0, 10) === plant.watering.substring(0, 10);
            });
            if (!wateringMatch) score += 1;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = plant;
            }
        });

        res.json(bestMatch ? [bestMatch] : [availableOptions]);
    });
}
