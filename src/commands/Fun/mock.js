import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function mockify(text) {
    return [...text]
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join('');
}

export default {
    data: new SlashCommandBuilder()
        .setName('mock')
        .setDescription('MoCk SoMeOnE\'s TeXt.')
        .addStringOption((o) =>
            o.setName('text').setDescription('Text to mock').setRequired(true).setMaxLength(500),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const text = interaction.options.getString('text');
        const mocked = mockify(text);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed('🐸 Mocked!', mocked)],
        });
    },
};
