
import express from 'express';
import fs from 'fs';
import path from 'path';
import { readDB } from '../db.js';
import { ROOT_DIR } from '../db.js';

export const recognizeRouter = express.Router();

const RECOGNIZED_DIR = path.join(ROOT_DIR, 'uploads', 'recognized');

function ensureUploadsDir() {
    if (!fs.existsSync(RECOGNIZED_DIR)) {
        fs.mkdirSync(RECOGNIZED_DIR, { recursive: true });
    }
}

function findInCatalog(catalog, guessedName) {
    if (!guessedName) return null;
    const normalized = guessedName.toLowerCase();

    let found = catalog.find(function (p) { return p.name.toLowerCase() === normalized; });
    if (found) return found;

    found = catalog.find(function (p) {
        const pName = p.name.toLowerCase();
        return pName.includes(normalized) || normalized.includes(pName);
    });
    return found || null;
}

recognizeRouter.post('/', async function (req, res) {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ success: false, error: 'no_image', message: 'Изображение не передано' });
        }

        const apiKey = process.env.PLANT_ID_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'no_api_key',
                message: 'На сервере не настроен PLANT_ID_API_KEY (см. .env)'
            });
        }

        const commaIndex = imageBase64.indexOf(',');
        const pureBase64 = commaIndex !== -1 ? imageBase64.slice(commaIndex + 1) : imageBase64;

        ensureUploadsDir();
        const fileName = 'recognized_' + Date.now() + '.jpg';
        const filePath = path.join(RECOGNIZED_DIR, fileName);
        try {
            fs.writeFileSync(filePath, Buffer.from(pureBase64, 'base64'));
        } catch (saveError) {
            console.error('Не удалось сохранить фото на диск:', saveError);
        }
        const savedPhotoUrl = '/uploads/recognized/' + fileName;

        let plantIdResponse;
        try {
            plantIdResponse = await fetch('https://api.plant.id/v3/identification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey
                },
                body: JSON.stringify({
                    images: [pureBase64],
                    similar_images: false
                })
            });
        } catch (networkError) {
            console.error('Ошибка сети при обращении к Plant.id:', networkError);
            return res.status(503).json({
                success: false,
                error: 'no_internet',
                message: 'Не удалось связаться с сервисом распознавания. Проверьте подключение к интернету.'
            });
        }

        if (plantIdResponse.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'rate_limit',
                message: 'Превышен лимит запросов к сервису распознавания (бесплатный тариф Plant.id). Попробуйте позже.'
            });
        }

        if (!plantIdResponse.ok) {
            const errText = await plantIdResponse.text().catch(function () { return ''; });
            console.error('Plant.id ответил ошибкой:', plantIdResponse.status, errText);
            return res.status(502).json({
                success: false,
                error: 'api_error',
                message: 'Сервис распознавания временно недоступен (код ' + plantIdResponse.status + ')'
            });
        }

        const data = await plantIdResponse.json();
        const isPlant = data && data.result && data.result.is_plant && data.result.is_plant.binary;
        const suggestions = (data && data.result && data.result.classification && data.result.classification.suggestions) || [];

        if (!isPlant || suggestions.length === 0) {
            return res.json({
                success: false,
                error: 'not_recognized',
                message: 'Не удалось распознать растение на фотографии. Попробуйте другое фото — крупным планом, при хорошем освещении.',
                savedPhotoUrl: savedPhotoUrl
            });
        }

        const best = suggestions[0];
        const guessedName = best.name || 'Неизвестное растение';
        const accuracy = typeof best.probability === 'number' ? Math.round(best.probability * 100) : null;

        const db = readDB();
        const catalogMatch = findInCatalog(db.catalog || [], guessedName);

        res.json({
            success: true,
            guessedName: guessedName,
            accuracy: accuracy,
            savedPhotoUrl: savedPhotoUrl,
            catalogMatch: catalogMatch ? { id: catalogMatch.id, name: catalogMatch.name, img: catalogMatch.img } : null,
            alternativeSuggestions: suggestions.slice(1, 4).map(function (s) {
                return { name: s.name, accuracy: Math.round((s.probability || 0) * 100) };
            })
        });
    } catch (error) {
        console.error('Непредвиденная ошибка распознавания:', error);
        res.status(500).json({ success: false, error: 'server_error', message: 'Внутренняя ошибка сервера при распознавании' });
    }
});
