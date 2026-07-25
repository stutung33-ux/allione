import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('reverse')
        .setDescription('Reverse the text you provide.')
        .addStringOption((o) =>
            o.setName('text').setDescription('Text to reverse').setRequired(true).setMaxLength(500),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const text = interaction.options.getString('text');
        const reversed = [...text].reverse().join('');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    '🔄 Text Reversed',
                    `**Original:** ${text}\n**Reversed:** ${reversed}`,
                ),
            ],
        });
    },
};
