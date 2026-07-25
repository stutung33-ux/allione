import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RESPONSES = [
    'bursts out laughing!',
    'can\'t stop laughing. Someone call a doctor.',
    'starts crying from laughing too hard.',
    'WHEEZE.',
    'loses it completely and falls off their chair.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('laugh')
        .setDescription('Laugh out loud!'),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed('😂 LOL!', `**${interaction.user.username}** ${resp} 💀`)],
        });
    },
};
