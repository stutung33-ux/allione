import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clap')
        .setDescription('Add 👏 claps 👏 between 👏 every 👏 word.')
        .addStringOption((o) =>
            o.setName('text').setDescription('Text to clapify').setRequired(true).setMaxLength(300),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const text = interaction.options.getString('text');
        const clapped = text.split(' ').join(' 👏 ');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed('👏 Clap Mode', clapped)],
        });
    },
};
