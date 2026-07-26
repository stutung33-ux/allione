// search_github.js — Searches GitHub repositories via the public REST API.

import axios from 'axios';
import { createEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
  async execute(interaction) {
    const query = interaction.options.getString('query');

    await InteractionHelper.safeDefer(interaction);

    try {
      const { data } = await axios.get('https://api.github.com/search/repositories', {
        params: { q: query, sort: 'stars', order: 'desc', per_page: 5 },
        headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'TitanBot' },
        timeout: 8_000,
      });

      if (!data.items?.length) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [createEmbed({
            title: 'GitHub — No Results',
            description: `No repositories found for **${query}**.`,
            color: 'warning',
          })],
        });
      }

      const fields = data.items.slice(0, 5).map(repo => ({
        name: `⭐ ${repo.stargazers_count.toLocaleString()}  •  ${repo.full_name}`,
        value: `${(repo.description || 'No description').substring(0, 100)}\n[View Repository](${repo.html_url})`,
        inline: false,
      }));

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({
          title: `🐙 GitHub — "${query}"`,
          description: `Top ${fields.length} repositories matching your search:`,
          color: 'dark',
          fields,
          url: `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`,
        })],
      });
    } catch (err) {
      logger.error('GitHub search error:', err);
      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({ title: 'GitHub Error', description: 'Could not reach GitHub. Try again later.', color: 'error' })],
      });
    }
  },
};
