import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'breaks down in tears.',
    'starts sobbing uncontrollably.',
    'cries into their pillow.',
    'weeps dramatically.',
    'releases the ugly cry.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('cry')
        .setDescription('Express your sadness — cry it out!'),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('cry');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '😭 Crying!',
                description: `**${interaction.user.username}** ${resp} 😭`,
                color: 'info',
                image: gifUrl,
            })],
        });
    },
};
