/**
 * TitanBot Animal Hunt System — Animal Definitions
 * Inspired by OwO Bot's rarity system, made uniquely TitanBot's own.
 *
 * Rarities (must sum to 100):
 *  common     58.00 %
 *  uncommon   28.00 %
 *  rare       10.00 %
 *  epic        2.50 %
 *  mythic      0.95 %
 *  legendary   0.04 %
 *  phantom     0.01 %
 */

export const RARITIES = {
  common: {
    id: 'common',
    label: 'Common',
    rarity: 58.0,
    color: 0x95a5a6,
    emoji: '⬜',
    sellPrice: { min: 1, max: 3 },
    order: 1,
  },
  uncommon: {
    id: 'uncommon',
    label: 'Uncommon',
    rarity: 28.0,
    color: 0x2ecc71,
    emoji: '🟩',
    sellPrice: { min: 8, max: 20 },
    order: 2,
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    rarity: 10.0,
    color: 0x3498db,
    emoji: '🟦',
    sellPrice: { min: 40, max: 100 },
    order: 3,
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    rarity: 2.5,
    color: 0x9b59b6,
    emoji: '🟪',
    sellPrice: { min: 200, max: 500 },
    order: 4,
  },
  mythic: {
    id: 'mythic',
    label: 'Mythic',
    rarity: 0.95,
    color: 0xe67e22,
    emoji: '🟧',
    sellPrice: { min: 1500, max: 4000 },
    order: 5,
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    rarity: 0.04,
    color: 0xf1c40f,
    emoji: '🌟',
    sellPrice: { min: 10000, max: 25000 },
    order: 6,
  },
  phantom: {
    id: 'phantom',
    label: 'Phantom',
    rarity: 0.01,
    color: 0x1abc9c,
    emoji: '👻',
    sellPrice: { min: 75000, max: 100000 },
    order: 7,
  },
};

export const ANIMALS = [
  // ─── Common ────────────────────────────────────────────────────────────────
  { id: 'snail',       name: 'Snail',       emoji: '🐌', rarity: 'common' },
  { id: 'cricket',     name: 'Cricket',     emoji: '🦗', rarity: 'common' },
  { id: 'ladybug',     name: 'Ladybug',     emoji: '🐞', rarity: 'common' },
  { id: 'caterpillar', name: 'Caterpillar', emoji: '🐛', rarity: 'common' },
  { id: 'worm',        name: 'Worm',        emoji: '🪱', rarity: 'common' },
  { id: 'ant',         name: 'Ant',         emoji: '🐜', rarity: 'common' },
  { id: 'bee',         name: 'Bee',         emoji: '🐝', rarity: 'common' },
  { id: 'fly',         name: 'Fly',         emoji: '🪰', rarity: 'common' },

  // ─── Uncommon ──────────────────────────────────────────────────────────────
  { id: 'rabbit',     name: 'Rabbit',     emoji: '🐇', rarity: 'uncommon' },
  { id: 'squirrel',   name: 'Squirrel',   emoji: '🐿️', rarity: 'uncommon' },
  { id: 'hedgehog',   name: 'Hedgehog',   emoji: '🦔', rarity: 'uncommon' },
  { id: 'duck',       name: 'Duck',       emoji: '🦆', rarity: 'uncommon' },
  { id: 'owl',        name: 'Owl',        emoji: '🦉', rarity: 'uncommon' },
  { id: 'peacock',    name: 'Peacock',    emoji: '🦚', rarity: 'uncommon' },
  { id: 'parrot',     name: 'Parrot',     emoji: '🦜', rarity: 'uncommon' },

  // ─── Rare ──────────────────────────────────────────────────────────────────
  { id: 'wolf',       name: 'Wolf',       emoji: '🐺', rarity: 'rare' },
  { id: 'fox',        name: 'Fox',        emoji: '🦊', rarity: 'rare' },
  { id: 'bear',       name: 'Bear',       emoji: '🐻', rarity: 'rare' },
  { id: 'lion',       name: 'Lion',       emoji: '🦁', rarity: 'rare' },
  { id: 'tiger',      name: 'Tiger',      emoji: '🐯', rarity: 'rare' },
  { id: 'shark',      name: 'Shark',      emoji: '🦈', rarity: 'rare' },

  // ─── Epic ──────────────────────────────────────────────────────────────────
  { id: 'dragon',     name: 'Dragon',     emoji: '🐲', rarity: 'epic' },
  { id: 'unicorn',    name: 'Unicorn',    emoji: '🦄', rarity: 'epic' },
  { id: 'eagle',      name: 'Golden Eagle', emoji: '🦅', rarity: 'epic' },
  { id: 'whale',      name: 'Blue Whale', emoji: '🐋', rarity: 'epic' },
  { id: 'gorilla',    name: 'Silverback', emoji: '🦍', rarity: 'epic' },

  // ─── Mythic ────────────────────────────────────────────────────────────────
  { id: 'storm_hawk',  name: 'Storm Hawk',  emoji: '⚡', rarity: 'mythic' },
  { id: 'frost_bear',  name: 'Frost Bear',  emoji: '❄️', rarity: 'mythic' },
  { id: 'moon_wolf',   name: 'Moon Wolf',   emoji: '🌙', rarity: 'mythic' },
  { id: 'void_fox',    name: 'Void Fox',    emoji: '🌑', rarity: 'mythic' },
  { id: 'flame_lion',  name: 'Flame Lion',  emoji: '🔥', rarity: 'mythic' },

  // ─── Legendary ─────────────────────────────────────────────────────────────
  { id: 'titan_wolf',      name: 'Titan Wolf',      emoji: '🌟', rarity: 'legendary' },
  { id: 'crystal_dragon',  name: 'Crystal Dragon',  emoji: '💎', rarity: 'legendary' },
  { id: 'solar_phoenix',   name: 'Solar Phoenix',   emoji: '☀️', rarity: 'legendary' },
  { id: 'comet_deer',      name: 'Comet Deer',      emoji: '☄️', rarity: 'legendary' },

  // ─── Phantom ───────────────────────────────────────────────────────────────
  { id: 'phantom_titan',  name: 'Phantom Titan',  emoji: '👻', rarity: 'phantom' },
  { id: 'void_leviathan', name: 'Void Leviathan', emoji: '🌌', rarity: 'phantom' },
  { id: 'stardust_fox',   name: 'Stardust Fox',   emoji: '✨', rarity: 'phantom' },
];

/** Look up a single animal definition by id. */
export function getAnimal(id) {
  return ANIMALS.find((a) => a.id === id) || null;
}

/** Look up a rarity definition. */
export function getRarity(id) {
  return RARITIES[id] || null;
}

/** Weighted-random animal roll. Returns an ANIMAL entry. */
export function rollAnimal() {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.rarity, 0);
  let rand = Math.random() * total;

  let chosenRarityId = 'common';
  for (const [id, r] of Object.entries(RARITIES)) {
    rand -= r.rarity;
    if (rand <= 0) { chosenRarityId = id; break; }
  }

  const pool = ANIMALS.filter((a) => a.rarity === chosenRarityId);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get the sell price for one of an animal (random within rarity range). */
export function getSellPrice(animal) {
  const rarity = RARITIES[animal.rarity];
  if (!rarity) return 1;
  const { min, max } = rarity.sellPrice;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Ordered list of rarities for display, rarest last. */
export function getOrderedRarities() {
  return Object.values(RARITIES).sort((a, b) => a.order - b.order);
}
