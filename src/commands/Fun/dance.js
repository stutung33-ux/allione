import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MOVES = [
    'busts out the robot.',
    'starts doing the moonwalk.',
    'breaks it down on the dance floor.',
    'flossing like there\'s no tomorrow.',
    'does an improvised Irish jig.',
    'sways awkwardly and calls it dancing.',
    'starts breakdancing and nails a windmill.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('Show off your dance moves!'),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const move = MOVES[Math.floor(Math.random() * MOVES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed('💃 Dance!', `**${interaction.user.username}** ${move} 🕺`)],
        });
    },
};
