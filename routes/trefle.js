import express from 'express';

export const trefleRouter = express.Router();

const TREFLE_BASE = 'https://trefle.io/api/v1';

trefleRouter.get('/search', async function (req, res) {
    const query = String(req.query.query || '').trim();
    if (!query) return res.status(400).json({ error: 'Не передан параметр query' });

    const apiKey = process.env.TREFLE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'На сервере не настроен TREFLE_API_KEY (см. .env)' });
    }

    try {
        const url = TREFLE_BASE + '/plants/search?token=' + encodeURIComponent(apiKey) + '&q=' + encodeURIComponent(query);
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(502).json({ error: 'Trefle вернул ошибку ' + response.status });
        }

        const json = await response.json();
        const results = (json.data || []).slice(0, 12).map(function (p) {
            return {
                trefleId: p.id,
                name: p.common_name || p.scientific_name,
                scientificName: p.scientific_name,
                img: p.image_url || null
            };
        });

        res.json(results);
    } catch (error) {
        console.error('Ошибка запроса к Trefle:', error);
        res.status(503).json({ error: 'Не удалось связаться с Trefle. Проверьте подключение к интернету.' });
    }
});
