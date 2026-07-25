import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'facepalms so hard the echo is heard worldwide.',
    'does a slow, disappointed facepalm.',
    'buries their face in their hands.',
    'facepalms so aggressively they leave a handprint.',
    'double facepalms.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('facepalm')
        .setDescription('Express your disbelief with a facepalm.'),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('facepalm');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '🤦 Facepalm!',
                description: `**${interaction.user.username}** ${resp}`,
                color: 'warning',
                image: gifUrl,
            })],
        });
    },
};
