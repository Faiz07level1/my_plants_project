const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3005;
const DB_FILE = path.join(__dirname, 'database.json');

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { catalog: [], users: [], collections: {}, tradeOffers: [], chats: {} };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/get-all' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(readDB()));
        return;
    }

    if (req.url === '/api/auth' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const { username } = JSON.parse(body);
            const data = readDB();
            if (!data.users.includes(username)) {
                data.users.push(username);
                if (!data.collections[username]) {
                    data.collections[username] = [];
                }
                writeDB(data);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', username }));
        });
        return;
    }

    if (req.url === '/api/save-collection' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const { username, collection } = JSON.parse(body);
            const data = readDB();
            data.collections[username] = collection;
            writeDB(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (req.url === '/api/save-trades' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const data = readDB();
            data.tradeOffers = JSON.parse(body);
            writeDB(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (req.url.startsWith('/api/chat/') && req.method === 'POST') {
        const offerId = req.url.split('/').pop();
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const data = readDB();
            data.chats[offerId] = JSON.parse(body);
            writeDB(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    if (req.url === '/api/recognize' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const db = readDB();
            const catalog = db.catalog || [];
            const randomIndex = Math.floor(Math.random() * catalog.length);
            const selectedPlant = catalog[randomIndex] || { id: 1, name: "Монстера" };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                plantId: selectedPlant.id,
                plantName: selectedPlant.name
            }));
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер успешно запущен на порту ${PORT}`);
});

