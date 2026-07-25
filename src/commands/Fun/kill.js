import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { fetchFunGif } from '../../utils/funGifs.js';

const METHODS = [
    'threw a rubber duck at',
    'scared to death with a dad joke,',
    'challenged to a maths exam and defeated',
    'tickled relentlessly until',
    'yeeted into the void,',
    'blasted with the power of cringe,',
    'defeated in a staring contest,',
    'crushed under a pile of unread notifications,',
    'obliterated with the power of a Discord notification,',
    'destroyed with an unsolicited opinion,',
];

export default {
    data: new SlashCommandBuilder()
        .setName('kill')
        .setDescription('Roleplay — dramatically "kill" someone. (Not real, obviously!)')
        .addUserOption((o) =>
            o.setName('user').setDescription('The target of your wrath').setRequired(true),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const method = METHODS[Math.floor(Math.random() * METHODS.length)];
        const gifUrl = await fetchFunGif('shoot');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '💀 Roleplay Kill',
                description: `**${interaction.user.username}** ${method} **${target.username}**! RIP. 😈\n\n*This is roleplay only. No one was harmed.*`,
                color: 'warning',
                image: gifUrl,
            })],
        });
    },
};
