/**
 * funGifs.js
 * Fetches random anime-style GIF URLs from the nekos.best public API.
 * No API key required. Returns null on any failure so callers can skip the image gracefully.
 */

import axios from 'axios';
import { logger } from './logger.js';

const NEKOS_BASE = 'https://nekos.best/api/v2';
const TIMEOUT_MS = 4000;

// nekos.best requires a descriptive User-Agent to avoid 403 responses
const REQUEST_HEADERS = {
    'User-Agent': 'TitanBot/2.1.0 (Discord bot; https://github.com/titanbot)',
    'Accept': 'application/json',
};

/**
 * Fetch a random GIF URL for a given category.
 * @param {string} category - A valid nekos.best endpoint (e.g. 'hug', 'pat', 'slap')
 * @returns {Promise<string|null>} The GIF URL, or null if the request fails
 */
export async function fetchFunGif(category) {
    try {
        const { data } = await axios.get(`${NEKOS_BASE}/${category}`, {
            timeout: TIMEOUT_MS,
            headers: REQUEST_HEADERS,
        });
        const url = data?.results?.[0]?.url ?? null;
        if (!url) {
            logger.warn(`fetchFunGif: no URL in response for category "${category}"`);
        }
        return url;
    } catch (err) {
        const status = err?.response?.status;
        const msg = status
            ? `fetchFunGif: HTTP ${status} for category "${category}"`
            : `fetchFunGif: request failed for category "${category}" — ${err.message}`;
        logger.warn(msg);
        return null;
    }
}
