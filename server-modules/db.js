import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'database.json');

export function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const initial = { catalog: [], users: [], collections: {}, favorites: {}, tradeOffers: [], chats: {} };
            fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
            return initial;
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function writeDB(data) {
    try {
        if (!data) return false;
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
