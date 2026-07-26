// search_youtube.js — Generates a YouTube search link (no API key required).

import { createEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
  async execute(interaction) {
    const query = interaction.options.getString('query');
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    return InteractionHelper.safeReply(interaction, {
      embeds: [createEmbed({
        title: '▶️ YouTube Search',
        description: `**[Search YouTube for "${query}"](${searchUrl})**\n\nClick the link above to view results on YouTube.`,
        color: 'error',   // YouTube red
        url: searchUrl,
      })],
    });
  },
};
