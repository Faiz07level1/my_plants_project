

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TREFLE_API_KEY, PLANTS_LIMIT, REQUEST_DELAY_MS } from './seed-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.json');

const TREFLE_BASE = 'https://trefle.io/api/v1';
const DEFAULT_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e6f4ea'/><text x='50' y='58' font-size='40' text-anchor='middle'>🌿</text></svg>";

function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️  database.json не найден или повреждён, будет создан новый.');
        return {
            catalog: [], users: [], collections: {}, favorites: {}, tradeOffers: [], chats: {},
            messages: {}, blockedUsers: {}, pinnedChats: {}, mutedChats: {}, groups: {}, deletedFor: {}
        };
    }
}

function writeDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

async function fetchPlantsPage(page) {
    const url = `${TREFLE_BASE}/plants?token=${TREFLE_API_KEY}&page=${page}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Trefle вернул ошибку ${response.status} на странице ${page}`);
    }
    const json = await response.json();
    return json.data || [];
}

async function fetchPlantDetail(plantId) {
    try {
        const url = `${TREFLE_BASE}/plants/${plantId}?token=${TREFLE_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = await response.json();
        return json.data || null;
    } catch (error) {
        return null;
    }
}

function describeLight(light) {
    if (typeof light !== 'number') {
        return 'Точных данных об освещении Trefle не предоставил — уточните индивидуально.';
    }
    if (light <= 3) return 'Предпочитает тень или полутень (по шкале освещённости Trefle).';
    if (light <= 6) return 'Хорошо растёт при ярком рассеянном свете (по шкале освещённости Trefle).';
    return 'Любит очень яркий свет, возможно прямое солнце (по шкале освещённости Trefle).';
}

function describeWatering(humidity) {
    if (typeof humidity !== 'number') {
        return 'Точный график полива Trefle не указывает — ориентируйтесь на подсыхание почвы.';
    }
    if (humidity <= 3) return 'Нуждается в редком поливе, неплохо переносит засуху (по данным Trefle).';
    if (humidity <= 6) return 'Умеренный, регулярный полив (по данным Trefle).';
    return 'Любит обильный и частый полив, важна повышенная влажность (по данным Trefle).';
}

const THORNY_WORDS = ['thistle', 'gorse', 'bramble', 'rose', 'holly', 'nettle', 'juniper', 'hawthorn'];
const FLOWERING_WORDS = ['clover', 'buttercup', 'heather', 'meadowsweet', 'heal-all', 'trefoil', 'vetch', 'poppy'];
const EDIBLE_WORDS = ['sorrel', 'nettle', 'clover', 'plantain', 'filbert', 'hazel', 'sloe', 'cow-parsnip'];
const MEDICINAL_WORDS = ['heal-all', 'plantain', 'nettle', 'meadowsweet', 'heather', 'yarrow', 'milfoil'];

function guessTypes(name, features) {
    const haystack = (name + ' ' + (features || '')).toLowerCase();
    const types = [];
    if (THORNY_WORDS.some(function (w) { return haystack.includes(w); })) types.push('thorny');
    if (FLOWERING_WORDS.some(function (w) { return haystack.includes(w); })) types.push('flowering');
    if (EDIBLE_WORDS.some(function (w) { return haystack.includes(w); })) types.push('edible');
    if (MEDICINAL_WORDS.some(function (w) { return haystack.includes(w); })) types.push('medicinal');
    return types;
}

function mapTrefleToCatalogItem(listItem, detail, localId) {
    const growth = (detail && detail.main_species && detail.main_species.growth) || {};
    const name = listItem.common_name || listItem.scientific_name || 'Неизвестное растение';
    const features = listItem.scientific_name ? `Научное название: ${listItem.scientific_name}.` : '';

    return {
        id: localId,
        trefleId: listItem.id,
        name: name,
        img: listItem.image_url || DEFAULT_IMG,
        watering: describeWatering(growth.atmospheric_humidity),
        lighting: describeLight(growth.light),
        repotting: 'Периодичность пересадки Trefle не указывает — рекомендуем ориентироваться на заполнение горшка корнями (обычно раз в 1-2 года).',
        toxicity: 'Trefle не предоставляет надёжных данных о токсичности — перед размещением рядом с детьми и животными уточните информацию отдельно.',
        isToxic: false,
        types: guessTypes(name, features),
        features: features
    };
}

async function main() {
    if (typeof fetch !== 'function') {
        console.error('❌ В вашей версии Node.js нет встроенного fetch. Нужен Node.js 18 или новее.');
        process.exit(1);
    }

    if (!TREFLE_API_KEY || TREFLE_API_KEY.includes('ВСТАВЬТЕ_СЮДА')) {
        console.error('❌ Не указан ключ Trefle API. Откройте seed-config.js и вставьте свой токен с trefle.io.');
        process.exit(1);
    }

    console.log('🌱 Начинаем загрузку растений из Trefle API...');

    const db = readDB();
    db.catalog = db.catalog || [];

    const existingByTrefleId = new Map();
    let maxLocalId = 0;
    db.catalog.forEach(function (item) {
        if (item.trefleId) existingByTrefleId.set(item.trefleId, item);
        if (typeof item.id === 'number' && item.id > maxLocalId) maxLocalId = item.id;
    });

    let added = 0;
    let updated = 0;
    let failed = 0;
    let processed = 0;
    let page = 1;

    while (processed < PLANTS_LIMIT) {
        let listItems;
        try {
            listItems = await fetchPlantsPage(page);
        } catch (error) {
            console.error(`⚠️  Не удалось получить страницу ${page}: ${error.message}`);
            break;
        }

        if (listItems.length === 0) {
            console.log('ℹ️  Trefle больше не возвращает растений, останавливаемся.');
            break;
        }

        for (const listItem of listItems) {
            if (processed >= PLANTS_LIMIT) break;
            processed++;

            try {
                await sleep(REQUEST_DELAY_MS);
                const detail = await fetchPlantDetail(listItem.id);

                const existing = existingByTrefleId.get(listItem.id);
                if (existing) {
                    const updatedItem = mapTrefleToCatalogItem(listItem, detail, existing.id);
                    Object.assign(existing, updatedItem);
                    updated++;
                    console.log(`🔄 Обновлено: ${updatedItem.name}`);
                } else {
                    maxLocalId++;
                    const newItem = mapTrefleToCatalogItem(listItem, detail, maxLocalId);
                    db.catalog.push(newItem);
                    existingByTrefleId.set(listItem.id, newItem);
                    added++;
                    console.log(`✅ Добавлено: ${newItem.name}`);
                }
            } catch (error) {
                failed++;
                console.error(`⚠️  Пропущено растение (ошибка): ${error.message}`);
            }
        }

        page++;
    }

    writeDB(db);

    console.log('');
    console.log('=== Готово ===');
    console.log(`Добавлено новых: ${added}`);
    console.log(`Обновлено существующих: ${updated}`);
    console.log(`Пропущено с ошибкой: ${failed}`);
    console.log(`Итого в справочнике: ${db.catalog.length}`);
    console.log('');
    console.log('⚠️  Trefle не даёт точных данных о поливе/токсичности/пересадке —');
    console.log('    эти поля заполнены общими формулировками. При необходимости');
    console.log('    отредактируйте их вручную прямо в database.json.');
}

main().catch(function (error) {
    console.error('❌ Скрипт завершился с ошибкой:', error);
    process.exit(1);
});
