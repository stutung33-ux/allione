import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'waves hello at',
    'gives a friendly wave to',
    'waves enthusiastically at',
    'does a big goofy wave at',
    'waves shyly at',
];

export default {
    data: new SlashCommandBuilder()
        .setName('wave')
        .setDescription('Wave at someone!')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to wave at').setRequired(false),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('wave');

        const desc = target
            ? `**${interaction.user.username}** ${resp} **${target.username}**! 👋`
            : `**${interaction.user.username}** waves at everyone! 👋`;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '👋 Wave!',
                description: desc,
                color: 'info',
                image: gifUrl,
            })],
        });
    },
};
