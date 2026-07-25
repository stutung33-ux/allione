import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'slaps with a fish',
    'delivers a mighty slap to',
    'SLAPS across the face',
    'gives a gentle (totally not gentle) slap to',
    'backhands dramatically',
];

export default {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Roleplay — slap someone!')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to slap').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('slap');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '👋 Slap!',
                description: `**${interaction.user.username}** ${resp} **${target.username}**! 😤`,
                color: 'warning',
                image: gifUrl,
            })],
        });
    },
};
