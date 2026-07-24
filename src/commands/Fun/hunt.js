/**
 * /hunt — TitanBot's animal hunting game.
 * Inspired by OwO Bot's hunt system, built natively for TitanBot.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { hunt, HUNT_COOLDOWN_MS } from '../../services/huntService.js';
import { RARITIES } from '../../data/animals.js';
import { logger } from '../../utils/logger.js';

// Rarity-based colors for the embed border
const RARITY_COLORS = {
  common:    0x95a5a6,
  uncommon:  0x2ecc71,
  rare:      0x3498db,
  epic:      0x9b59b6,
  mythic:    0xe67e22,
  legendary: 0xf1c40f,
  phantom:   0x1abc9c,
};

// Fun flavor text per rarity tier
const RARITY_FLAVOR = {
  common:    ['You rummage through the bushes...', 'Something stirs in the undergrowth...', 'You hear rustling nearby...'],
  uncommon:  ['A creature dashes past!', 'Quick reflexes pay off!', 'You spot something in the distance!'],
  rare:      ['A rare beast emerges from the shadows!', 'Your heart races as it approaches!', 'Only the skilled find these...'],
  epic:      ['The ground shakes as something powerful appears!', 'An epic creature materializes!', 'Legends speak of beasts like this!'],
  mythic:    ['The air crackles with energy!', 'A mythic being graces your presence!', 'Once in a lifetime...'],
  legendary: ['**THE EARTH TREMBLES!!**', '**A LEGENDARY CREATURE APPEARS!!**', '**IMPOSSIBLE — YET HERE IT STANDS!!**'],
  phantom:   ['**THE VEIL BETWEEN WORLDS TEARS OPEN!!**', '**A PHANTOM TITAN MATERIALIZES FROM NOTHING!!**', '**THE UNIVERSE ITSELF HOLDS ITS BREATH!!**'],
};

function getFlavor(rarity) {
  const lines = RARITY_FLAVOR[rarity] || RARITY_FLAVOR.common;
  return lines[Math.floor(Math.random() * lines.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Go hunting for animals! Catch common critters or legendary beasts.'),

  category: 'Fun',

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const { animal } = await hunt(client, guildId, userId);

    const rarity = RARITIES[animal.rarity];
    const flavor = getFlavor(animal.rarity);
    const cooldownSec = HUNT_COOLDOWN_MS / 1000;

    const embed = new EmbedBuilder()
      .setColor(RARITY_COLORS[animal.rarity] || 0x95a5a6)
      .setDescription(
        `${flavor}\n\n` +
        `${animal.emoji} **You caught a ${animal.name}!**\n` +
        `${rarity.emoji} *${rarity.label}*`
      )
      .setFooter({ text: `Hunt again in ${cooldownSec}s • /zoo to view your collection • /sell-animal to sell` })
      .setTimestamp();

    // Give the embed title a rarity prefix (no emojis stripped since setTitle is patched)
    embed.setTitle(`${interaction.user.displayName || interaction.user.username} went hunting!`);

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });

    logger.debug('[HUNT CMD] Hunt completed', {
      userId,
      guildId,
      animalId: animal.id,
      rarity: animal.rarity,
    });
  }),
};
