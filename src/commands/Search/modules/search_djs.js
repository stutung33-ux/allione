// search_djs.js — Links to Discord.js documentation search.

import { createEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
  async execute(interaction) {
    const query = interaction.options.getString('query');
    const docsUrl = `https://discord.js.org/#/docs/discord.js/main/search?query=${encodeURIComponent(query)}`;
    const guideUrl = `https://discordjs.guide/`;

    return InteractionHelper.safeReply(interaction, {
      embeds: [createEmbed({
        title: '📚 Discord.js Documentation',
        description: [
          `**[Search docs for "${query}"](${docsUrl})**`,
          '',
          `• [Official Documentation](https://discord.js.org)`,
          `• [Discord.js Guide](${guideUrl})`,
          `• [GitHub Source](https://github.com/discordjs/discord.js)`,
        ].join('\n'),
        color: 'blurple',
        url: docsUrl,
      })],
    });
  },
};
