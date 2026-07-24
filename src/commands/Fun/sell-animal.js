/**
 * /sell-animal — Sell animals from your zoo for coins.
 * Uses autocomplete to show only animals the user currently owns.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { sellAnimals, getHuntData } from '../../services/huntService.js';
import { ANIMALS, RARITIES, getAnimal } from '../../data/animals.js';
import { BotConfig } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

// Build a fast lookup: animalId → definition
const ANIMAL_MAP = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

export default {
  data: new SlashCommandBuilder()
    .setName('sell-animal')
    .setDescription('Sell animals from your zoo for coins.')
    .addStringOption((opt) =>
      opt
        .setName('animal')
        .setDescription('Which animal to sell (type to search)')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('How many to sell (default 1; enter 9999 to sell all)')
        .setRequired(false)
        .setMinValue(1),
    ),

  category: 'Fun',

  /** Autocomplete handler — returns only animals the user owns */
  async autocomplete(interaction, client) {
    try {
      const guildId = interaction.guildId;
      const userId = interaction.user.id;
      const focused = interaction.options.getFocused().toLowerCase();

      const huntData = await getHuntData(client, guildId, userId);

      const choices = Object.entries(huntData.zoo)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => {
          const def = ANIMAL_MAP[id];
          if (!def) return null;
          const rarity = RARITIES[def.rarity];
          return {
            name: `${def.emoji} ${def.name} (${rarity?.label ?? def.rarity}) — x${count}`,
            value: id,
          };
        })
        .filter(Boolean)
        .filter((c) => c.name.toLowerCase().includes(focused))
        .slice(0, 25);

      await interaction.respond(choices);
    } catch {
      await interaction.respond([]).catch(() => {});
    }
  },

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const animalId = interaction.options.getString('animal');
    const rawAmount = interaction.options.getInteger('amount') ?? 1;

    // 9999 is the sentinel for "sell all"
    const amount = rawAmount >= 9999 ? 'all' : rawAmount;

    // Guard: animal id must be valid
    const animalDef = ANIMAL_MAP[animalId];
    if (!animalDef) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setDescription(`Unknown animal \`${animalId}\`. Use the autocomplete list to pick an animal from your zoo.`);
      return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    // Guard: user must own the animal
    const huntData = await getHuntData(client, guildId, userId);
    const owned = huntData.zoo[animalId] || 0;
    if (owned === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setDescription(
          `You don't have any **${animalDef.emoji} ${animalDef.name}** in your zoo!\nGo catch some with \`/hunt\`.`,
        );
      return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    const { animal, sold, earned, newWallet } = await sellAnimals(
      client,
      guildId,
      userId,
      animalId,
      amount,
    );

    const rarity = RARITIES[animal.rarity];
    const currencySymbol = BotConfig.economy?.currency?.symbol ?? '$';

    const embed = new EmbedBuilder()
      .setColor(rarity?.color ?? 0x2ecc71)
      .setTitle('Animals Sold!')
      .setDescription(
        `${animal.emoji} You sold **${sold}x ${animal.name}** for **${currencySymbol}${earned.toLocaleString()}**!\n\n` +
          `Wallet: **${currencySymbol}${newWallet.toLocaleString()}**`,
      )
      .setFooter({ text: '/zoo to view remaining animals' })
      .setTimestamp();

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });

    logger.info('[SELL-ANIMAL CMD] Sold', {
      userId,
      guildId,
      animalId,
      sold,
      earned,
    });
  }),
};
