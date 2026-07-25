import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

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
        const gifUrl = await fetchFunGif('highfive');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '🙌 High Five!',
                description: `**${interaction.user.username}** ${resp} **${target.username}**! 🙌`,
                color: 'success',
                image: gifUrl,
            })],
        });
    },
};
