import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const RESPONSES = [
    'wraps their arms around',
    'gives a big warm hug to',
    'squeezes tightly',
    'gives a surprise bear hug to',
    'embraces lovingly',
];

export default {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give someone a warm hug.')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to hug').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const gifUrl = await fetchFunGif('hug');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '🤗 Hug!',
                description: `**${interaction.user.username}** ${resp} **${target.username}**! 💞`,
                color: 'success',
                image: gifUrl,
            })],
        });
    },
};
