
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv() {
    const envPath = path.join(__dirname, '.env');

    try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split(/\r?\n/);

        lines.forEach(function (rawLine) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) return;

            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) return;

            const key = line.slice(0, eqIndex).trim();
            let value = line.slice(eqIndex + 1).trim();

            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        });
    } catch (error) {
        console.warn('⚠️  Файл .env не найден — используются значения по умолчанию (если заданы в коде). Скопируйте .env.example в .env и впишите свои ключи.');
    }
}
