/**
 * /zoo — View your animal collection from the TitanBot hunt game.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { getZooDisplay } from '../../services/huntService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zoo')
    .setDescription("View your (or another user's) animal collection.")
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to inspect').setRequired(false),
    ),

  category: 'Fun',

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    if (targetUser.bot) {
      return await InteractionHelper.safeEditReply(interaction, {
        content: "Bots don't have a zoo!",
      });
    }

    const { sections, totalOwned, totalHunted } = await getZooDisplay(
      client,
      guildId,
      targetUser.id,
    );

    if (sections.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle(`${targetUser.displayName || targetUser.username}'s Zoo`)
        .setDescription(
          targetUser.id === interaction.user.id
            ? "Your zoo is empty! Use `/hunt` to catch some animals."
            : "This user's zoo is empty.",
        )
        .setFooter({ text: 'Use /hunt to start catching animals!' });

      return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    // Build description grouped by rarity (rarest last for visual drama)
    const lines = [];
    for (const { rarity, animals } of sections) {
      lines.push(`**${rarity.emoji} ${rarity.label}**`);
      for (const animal of animals) {
        lines.push(`${animal.emoji} ${animal.name} — **x${animal.count}**`);
      }
      lines.push('');
    }

    // Trim trailing blank line
    while (lines[lines.length - 1] === '') lines.pop();

    const description = lines.join('\n');

    // Split into pages if over Discord's 4096-char limit
    const PAGE_LIMIT = 3800;
    const pages = [];
    let current = '';
    for (const line of lines) {
      if (current.length + line.length + 1 > PAGE_LIMIT) {
        pages.push(current.trim());
        current = line + '\n';
      } else {
        current += line + '\n';
      }
    }
    if (current.trim()) pages.push(current.trim());

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`${targetUser.displayName || targetUser.username}'s Zoo`)
      .setDescription(pages[0] || 'No animals found.')
      .setFooter({
        text: `${totalOwned} animals owned • ${totalHunted} total hunted • /sell-animal to sell`,
      })
      .setTimestamp();

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });

    logger.debug('[ZOO CMD] Zoo displayed', {
      requesterId: interaction.user.id,
      targetId: targetUser.id,
      guildId,
      totalOwned,
    });
  }),
};
