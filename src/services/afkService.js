/**
 * afkService.js — AFK system service.
 * Stores/retrieves AFK status per user per guild.
 */

import { getAFKKey } from '../utils/database/keys.js';
import { logger } from '../utils/logger.js';

/**
 * Set a user as AFK.
 * @param {object} client - Discord client with db attached
 * @param {string} guildId
 * @param {string} userId
 * @param {string} reason
 */
export async function setAFK(client, guildId, userId, reason = 'No reason provided') {
    const key = getAFKKey(guildId, userId);
    const data = {
        reason,
        timestamp: Date.now(),
        userId,
        guildId,
    };
    await client.db.set(key, data);
    logger.info(`AFK set for user ${userId} in guild ${guildId}: ${reason}`);
}

/**
 * Remove a user's AFK status.
 * @param {object} client
 * @param {string} guildId
 * @param {string} userId
 */
export async function removeAFK(client, guildId, userId) {
    const key = getAFKKey(guildId, userId);
    await client.db.delete(key);
    logger.info(`AFK removed for user ${userId} in guild ${guildId}`);
}

/**
 * Get a user's AFK data (null if not AFK).
 * @param {object} client
 * @param {string} guildId
 * @param {string} userId
 * @returns {object|null}
 */
export async function getAFK(client, guildId, userId) {
    const key = getAFKKey(guildId, userId);
    const data = await client.db.get(key, null);
    return data;
}
