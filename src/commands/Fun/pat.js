import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'gives a gentle pat on the head.',
    'pats lovingly.',
    'pats and whispers "good job!"',
    'gives the most comforting head pat.',
    'pats with both hands.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('Give someone a warm head pat.')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to pat').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('pat');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '👋 Pat!',
                description: `**${interaction.user.username}** ${resp} **${target.username}** 🥺`,
                color: 'success',
                image: gifUrl,
            })],
        });
    },
};
