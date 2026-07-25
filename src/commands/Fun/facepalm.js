import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RESPONSES = [
    'faceplams so hard they see stars.',
    'slowly raises a hand to their face in disbelief.',
    'double faceplams.',
    'does the Picard facepalm.',
    'facepalms with both hands and sighs loudly.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('facepalm')
        .setDescription('Express your disappointment with a dramatic facepalm.'),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [warningEmbed('🤦 Facepalm!', `**${interaction.user.username}** ${resp}`)],
        });
    },
};
