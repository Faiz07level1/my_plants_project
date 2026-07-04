

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.json');

const MANUAL_TYPES = {
    'Монстера': ['indoor', 'toxic'],
    'Сансевиерия': ['indoor', 'toxic'],
    'Хлорофитум': ['indoor']
};

const THORNY_WORDS = ['thistle', 'gorse', 'bramble', 'rose', 'holly', 'nettle', 'juniper', 'hawthorn'];
const FLOWERING_WORDS = ['clover', 'buttercup', 'heather', 'meadowsweet', 'heal-all', 'trefoil', 'vetch', 'poppy'];
const EDIBLE_WORDS = ['sorrel', 'nettle', 'clover', 'plantain', 'filbert', 'hazel', 'sloe', 'cow-parsnip'];
const MEDICINAL_WORDS = ['heal-all', 'plantain', 'nettle', 'meadowsweet', 'heather', 'yarrow', 'milfoil'];
const TREE_WORDS = ['oak', 'ash', 'beech', 'pine', 'quickbeam', 'sloe']; // деревья не "комнатные"

function guessTypes(plant) {
    const haystack = [
        plant.name || '',
        plant.features || '',
        plant.toxicity || ''
    ].join(' ').toLowerCase();

    const types = [];

    if (plant.isToxic) types.push('toxic');
    if (THORNY_WORDS.some(function (w) { return haystack.includes(w); })) types.push('thorny');
    if (FLOWERING_WORDS.some(function (w) { return haystack.includes(w); })) types.push('flowering');
    if (EDIBLE_WORDS.some(function (w) { return haystack.includes(w); })) types.push('edible');
    if (MEDICINAL_WORDS.some(function (w) { return haystack.includes(w); })) types.push('medicinal');

    if (!plant.trefleId) {
        types.push('indoor');
    }

    return Array.from(new Set(types));
}

function main() {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);

    let updatedCount = 0;

    db.catalog = (db.catalog || []).map(function (plant) {
        if (Array.isArray(plant.types) && plant.types.length > 0) {
            return plant; 
        }

        const manual = MANUAL_TYPES[plant.name];
        plant.types = manual ? manual.slice() : guessTypes(plant);
        updatedCount++;
        return plant;
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log('✅ Категории проставлены для ' + updatedCount + ' растений (из ' + db.catalog.length + ').');
    console.log('   Поле "types" можно свободно поправить вручную в database.json.');
}

main();
