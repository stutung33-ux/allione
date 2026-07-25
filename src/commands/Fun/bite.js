import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RESPONSES = [
    'sneaks up and bites',
    'chomps on the arm of',
    'nom nom noms on',
    'gently bites the shoulder of',
    'playfully gnaws at',
];

export default {
    data: new SlashCommandBuilder()
        .setName('bite')
        .setDescription('Roleplay — bite someone!')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to bite').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [warningEmbed('😬 Bite!', `**${interaction.user.username}** ${resp} **${target.username}**! 🦷`)],
        });
    },
};
