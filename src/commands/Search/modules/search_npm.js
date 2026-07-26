// search_npm.js — Searches npm packages via the npm registry API.

import axios from 'axios';
import { createEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
  async execute(interaction) {
    const query = interaction.options.getString('query');

    await InteractionHelper.safeDefer(interaction);

    try {
      const { data } = await axios.get('https://registry.npmjs.org/-/v1/search', {
        params: { text: query, size: 5 },
        timeout: 8_000,
      });

      if (!data.objects?.length) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [createEmbed({
            title: 'npm — No Results',
            description: `No packages found for **${query}**.`,
            color: 'warning',
          })],
        });
      }

      const fields = data.objects.slice(0, 5).map(({ package: pkg }) => ({
        name: `📦 ${pkg.name}  •  v${pkg.version}`,
        value: `${(pkg.description || 'No description').substring(0, 100)}\n[View on npm](https://www.npmjs.com/package/${encodeURIComponent(pkg.name)})`,
        inline: false,
      }));

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({
          title: `📦 npm — "${query}"`,
          description: `Top ${fields.length} packages matching your search:`,
          color: 'error',   // npm red
          fields,
          url: `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`,
        })],
      });
    } catch (err) {
      logger.error('npm search error:', err);
      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({ title: 'npm Error', description: 'Could not reach the npm registry. Try again later.', color: 'error' })],
      });
    }
  },
};
