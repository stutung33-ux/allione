import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const RESPONSES = [
    'throws a wild haymaker at',
    'delivers an uppercut to',
    'punches dramatically',
    'jabs twice then uppercuts',
    'wind-milled their fists at',
];

export default {
    data: new SlashCommandBuilder()
        .setName('punch')
        .setDescription('Roleplay — punch someone!')
        .addUserOption((o) =>
            o.setName('user').setDescription('Who to punch').setRequired(true),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const resp = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [warningEmbed('👊 Punch!', `**${interaction.user.username}** ${resp} **${target.username}**! 💥`)],
        });
    },
};
