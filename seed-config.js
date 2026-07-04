

import { loadEnv } from './env.js';

loadEnv();

export const TREFLE_API_KEY = process.env.TREFLE_API_KEY || '';

export const PLANTS_LIMIT = 40;

export const REQUEST_DELAY_MS = 1100;
