import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RESPONSES = [
    'goes for a high five with',
    'slaps hands in a triumphant high five with',
    'gives an enthusiastic high five to',
    'reaches up for a sky-high five with',
    'delivers the cleanest high five to',
];

export default {
    data: new SlashCommandBuilder()
        .setName('highfive')
        .setDescription('High five someone!')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to high five').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed('🙌 High Five!', `**${interaction.user.username}** ${resp} **${target.username}**! 🙌`)],
        });
    },
};
