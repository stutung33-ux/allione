// search_wikipedia.js — Wikipedia summary via the REST API (no key required).

import axios from 'axios';
import { createEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
  async execute(interaction) {
    const query = interaction.options.getString('query');
    const slug = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;

    await InteractionHelper.safeDefer(interaction);

    try {
      const { data } = await axios.get(apiUrl, { timeout: 8_000 });

      if (data.type === 'disambiguation') {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [createEmbed({
            title: '🔍 Wikipedia — Disambiguation',
            description: `**${data.title}** is ambiguous. Try a more specific term.\n[Open Wikipedia](${data.content_urls?.desktop?.page})`,
            color: 'info',
          })],
        });
      }

      const description = (data.extract || 'No summary available.').substring(0, 900);
      const thumbnail = data.thumbnail?.source || null;

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({
          title: `📖 ${data.title}`,
          description: `${description}${data.extract?.length > 900 ? '…' : ''}\n\n[Read more on Wikipedia](${data.content_urls?.desktop?.page})`,
          color: 'info',
          thumbnail,
        })],
      });
    } catch (err) {
      if (err.response?.status === 404) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [createEmbed({
            title: 'Wikipedia — Not Found',
            description: `No Wikipedia article found for **${query}**. Try a different search term.`,
            color: 'warning',
          })],
        });
      }
      logger.error('Wikipedia search error:', err);
      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({ title: 'Wikipedia Error', description: 'Could not reach Wikipedia. Try again later.', color: 'error' })],
      });
    }
  },
};
