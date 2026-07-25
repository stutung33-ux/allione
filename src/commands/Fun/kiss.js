import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'blows a kiss to',
    'gives a peck on the cheek of',
    'plants a kiss on the forehead of',
    'gives a shy kiss to',
    'dramatically kisses the hand of',
];

export default {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Roleplay — kiss someone!')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to kiss').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('kiss');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '💋 Kiss!',
                description: `**${interaction.user.username}** ${resp} **${target.username}**! 😘`,
                color: 'success',
                image: gifUrl,
            })],
        });
    },
};
