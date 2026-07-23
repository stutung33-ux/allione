/**
 * autoresponderService.js — Autoresponder system service.
 * Stores trigger→response pairs per guild and checks incoming messages.
 */

import { getAutoresponderKey } from '../utils/database/keys.js';
import { logger } from '../utils/logger.js';

/**
 * Get all autoresponder entries for a guild.
 * Returns an array of { trigger, response } objects.
 */
export async function getAutoresponders(client, guildId) {
    const key = getAutoresponderKey(guildId);
    const data = await client.db.get(key, null);
    if (!Array.isArray(data)) return [];
    return data;
}

/**
 * Add or update a trigger→response pair.
 * Returns the updated list.
 */
export async function addAutoresponder(client, guildId, trigger, response) {
    const key = getAutoresponderKey(guildId);
    const list = await getAutoresponders(client, guildId);

    const normalizedTrigger = trigger.toLowerCase().trim();
    const existing = list.findIndex((e) => e.trigger === normalizedTrigger);

    if (existing >= 0) {
        list[existing].response = response;
    } else {
        list.push({ trigger: normalizedTrigger, response });
    }

    await client.db.set(key, list);
    logger.info(`Autoresponder added/updated in guild ${guildId}: "${normalizedTrigger}"`);
    return list;
}

/**
 * Remove a trigger.
 * Returns true if something was removed, false if not found.
 */
export async function removeAutoresponder(client, guildId, trigger) {
    const key = getAutoresponderKey(guildId);
    const list = await getAutoresponders(client, guildId);

    const normalizedTrigger = trigger.toLowerCase().trim();
    const newList = list.filter((e) => e.trigger !== normalizedTrigger);

    if (newList.length === list.length) return false;

    await client.db.set(key, newList);
    logger.info(`Autoresponder removed in guild ${guildId}: "${normalizedTrigger}"`);
    return true;
}

/**
 * Remove all autoresponders for a guild.
 */
export async function clearAutoresponders(client, guildId) {
    const key = getAutoresponderKey(guildId);
    await client.db.set(key, []);
    logger.info(`All autoresponders cleared for guild ${guildId}`);
}

/**
 * Check a message against all triggers and return the matching response, or null.
 * Matching is case-insensitive, whole-word contained within the message.
 */
export async function matchAutoresponder(client, guildId, messageContent) {
    const list = await getAutoresponders(client, guildId);
    if (!list.length) return null;

    const lower = messageContent.toLowerCase();
    for (const entry of list) {
        if (lower.includes(entry.trigger)) {
            return entry.response;
        }
    }
    return null;
}
