import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Can\'t decide? Let the bot choose for you.')
        .addStringOption((o) =>
            o
                .setName('choices')
                .setDescription('Comma-separated list of options (e.g. pizza, burger, sushi)')
                .setRequired(true)
                .setMaxLength(500),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const raw = interaction.options.getString('choices');
        const choices = raw.split(',').map((c) => c.trim()).filter(Boolean);

        if (choices.length < 2) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [warningEmbed('Not Enough Choices', 'Please provide at least 2 comma-separated options.')],
            });
        }

        const pick = choices[Math.floor(Math.random() * choices.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    '🎲 Decision Made!',
                    `From **${choices.length}** options, I choose:\n\n**${pick}**`,
                ),
            ],
        });
    },
};
