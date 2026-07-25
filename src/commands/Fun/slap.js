import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [warningEmbed('👋 Slap!', `**${interaction.user.username}** ${resp} **${target.username}**! 😤`)],
        });
    },
};
