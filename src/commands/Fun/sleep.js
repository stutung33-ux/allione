import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'passes out on the keyboard.',
    'drifts off into dreamland.',
    'immediately falls asleep. Snoring intensifies.',
    'goes to take a "quick nap" — see you in 12 hours.',
    'collapses and is out cold.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('sleep')
        .setDescription('Take a nap. You deserve it.'),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('sleep');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '😴 Sleep!',
                description: `**${interaction.user.username}** ${resp} 💤`,
                color: 'info',
                image: gifUrl,
            })],
        });
    },
};
