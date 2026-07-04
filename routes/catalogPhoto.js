import express from 'express';
import fs from 'fs';
import path from 'path';
import { readDB, writeDB, ROOT_DIR } from '../db.js';

export const catalogPhotoRouter = express.Router();

const PLANTS_DIR = path.join(ROOT_DIR, 'uploads', 'plants');

function ensurePlantsDir() {
    if (!fs.existsSync(PLANTS_DIR)) {
        fs.mkdirSync(PLANTS_DIR, { recursive: true });
    }
}

catalogPhotoRouter.post('/:id/photo', function (req, res) {
    try {
        const plantId = Number(req.params.id);
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Изображение не передано' });
        }

        const db = readDB();
        const plant = (db.catalog || []).find(function (p) { return p.id === plantId; });
        if (!plant) return res.status(404).json({ error: 'Растение не найдено в справочнике' });

        const commaIndex = imageBase64.indexOf(',');
        const pureBase64 = commaIndex !== -1 ? imageBase64.slice(commaIndex + 1) : imageBase64;

        ensurePlantsDir();
        const fileName = 'plant_' + plantId + '_' + Date.now() + '.jpg';
        fs.writeFileSync(path.join(PLANTS_DIR, fileName), Buffer.from(pureBase64, 'base64'));

        plant.img = '/uploads/plants/' + fileName;
        plant.imgIsCustom = true; 
        writeDB(db);

        res.json({ success: true, img: plant.img });
    } catch (error) {
        console.error('Ошибка загрузки фото растения:', error);
        res.status(500).json({ error: 'Не удалось сохранить фотографию' });
    }
});
