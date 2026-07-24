/**
 * TitanBot Hunt Service
 * Core logic for the animal hunt/zoo game system.
 */

import { logger } from '../utils/logger.js';
import { getEconomyData, setEconomyData } from '../utils/economy.js';
import { rollAnimal, getSellPrice, getAnimal, getOrderedRarities, ANIMALS, RARITIES } from '../data/animals.js';
import { wrapServiceClassMethods } from '../utils/serviceErrorBoundary.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';

// Key helpers for hunt data storage
export function getHuntKey(guildId, userId) {
  return `guild:${guildId}:hunt:${userId}`;
}

/** Default structure for a user's hunt data */
function defaultHuntData() {
  return {
    zoo: {},          // { animalId: count }
    totalHunted: 0,
    lastHunt: 0,
  };
}

/** Load hunt data for a user */
export async function getHuntData(client, guildId, userId) {
  try {
    const key = getHuntKey(guildId, userId);
    const raw = await client.db.get(key, {});
    return { ...defaultHuntData(), ...raw };
  } catch (err) {
    logger.error('[HUNT] Failed to load hunt data', { userId, guildId, err });
    return defaultHuntData();
  }
}

/** Save hunt data for a user */
export async function setHuntData(client, guildId, userId, data) {
  try {
    const key = getHuntKey(guildId, userId);
    await client.db.set(key, data);
    return true;
  } catch (err) {
    logger.error('[HUNT] Failed to save hunt data', { userId, guildId, err });
    return false;
  }
}

// Cooldown: 15 seconds (same as OwO)
export const HUNT_COOLDOWN_MS = 15_000;

/**
 * Perform a hunt for a user.
 * Returns { animal, cooldownRemaining } — cooldownRemaining is 0 on success.
 */
export async function hunt(client, guildId, userId) {
  const huntData = await getHuntData(client, guildId, userId);

  const now = Date.now();
  const remaining = huntData.lastHunt + HUNT_COOLDOWN_MS - now;

  if (remaining > 0) {
    throw createError(
      'Hunt cooldown active',
      ErrorTypes.RATE_LIMIT,
      `You're still on the hunt trail! Wait **${Math.ceil(remaining / 1000)}s** before hunting again.`,
      { remaining, cooldownType: 'hunt' },
    );
  }

  const animal = rollAnimal();

  huntData.zoo[animal.id] = (huntData.zoo[animal.id] || 0) + 1;
  huntData.totalHunted = (huntData.totalHunted || 0) + 1;
  huntData.lastHunt = now;

  await setHuntData(client, guildId, userId, huntData);

  logger.debug('[HUNT] Animal caught', { userId, guildId, animalId: animal.id, rarity: animal.rarity });

  return { animal };
}

/**
 * Sell one or more of an animal from a user's zoo.
 * Returns { sold, total, earned, newBalance }
 */
export async function sellAnimals(client, guildId, userId, animalId, amount) {
  const huntData = await getHuntData(client, guildId, userId);
  const owned = huntData.zoo[animalId] || 0;

  if (owned === 0) {
    throw createError(
      'Animal not owned',
      ErrorTypes.VALIDATION,
      `You don't have any **${getAnimal(animalId)?.name || animalId}** in your zoo.`,
    );
  }

  const sellCount = amount === 'all' ? owned : Math.min(amount, owned);

  if (sellCount <= 0) {
    throw createError(
      'Invalid sell amount',
      ErrorTypes.VALIDATION,
      'You must sell at least 1 animal.',
    );
  }

  // Calculate earnings (each sells for an independent random price)
  let earned = 0;
  const animal = getAnimal(animalId);
  for (let i = 0; i < sellCount; i++) {
    earned += getSellPrice(animal);
  }

  // Deduct from zoo
  huntData.zoo[animalId] = owned - sellCount;
  if (huntData.zoo[animalId] <= 0) delete huntData.zoo[animalId];
  await setHuntData(client, guildId, userId, huntData);

  // Add coins to wallet
  const econData = await getEconomyData(client, guildId, userId);
  econData.wallet = (econData.wallet || 0) + earned;
  await setEconomyData(client, guildId, userId, econData);

  logger.info('[HUNT] Animals sold', { userId, guildId, animalId, sellCount, earned });

  return { animal, sold: sellCount, total: owned, earned, newWallet: econData.wallet };
}

/**
 * Get a user's zoo data formatted for display.
 * Returns grouped/sorted entries.
 */
export async function getZooDisplay(client, guildId, userId) {
  const huntData = await getHuntData(client, guildId, userId);

  // Build a lookup map: animalId → full definition
  const animalMap = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

  // Group by rarity
  const grouped = {};
  for (const [animalId, count] of Object.entries(huntData.zoo)) {
    if (count <= 0) continue;
    const def = animalMap[animalId];
    if (!def) continue;
    if (!grouped[def.rarity]) grouped[def.rarity] = [];
    grouped[def.rarity].push({ ...def, count });
  }

  const orderedRarities = getOrderedRarities();
  const sections = [];

  for (const rarityDef of orderedRarities) {
    const entries = grouped[rarityDef.id];
    if (!entries || entries.length === 0) continue;
    sections.push({ rarity: rarityDef, animals: entries });
  }

  const totalOwned = Object.values(huntData.zoo).reduce((s, v) => s + v, 0);

  return { sections, totalOwned, totalHunted: huntData.totalHunted || 0 };
}
