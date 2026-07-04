
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = path.join(__dirname, 'database.json');
export const ROOT_DIR = __dirname;


function emptyDB() {
    return {
        catalog: [],
        users: [],
        collections: {},
        favorites: {},
        tradeOffers: [],
        chats: {},          
        messages: {},        
        blockedUsers: {},   
        pinnedChats: {},    
        mutedChats: {},     
        groups: {},         
        deletedFor: {}     
    };
}

export function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(data);
        const defaults = emptyDB();
        Object.keys(defaults).forEach(function (key) {
            if (parsed[key] === undefined) parsed[key] = defaults[key];
        });
        return parsed;
    } catch (e) {
        return emptyDB();
    }
}

export function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}
