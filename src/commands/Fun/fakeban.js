import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('fakeban')
        .setDescription('Pretend to ban a user (fake, no actual action taken).')
        .addUserOption((o) =>
            o.setName('user').setDescription('The user to "ban"').setRequired(true),
        )
        .addStringOption((o) =>
            o.setName('reason').setDescription('Fake reason for the ban').setRequired(false).setMaxLength(200),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Being too awesome';

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                errorEmbed(
                    `🔨 ${target.username} has been banned!`,
                    [
                        `**User:** ${target} (${target.tag})`,
                        `**Reason:** ${reason}`,
                        `**Banned by:** ${interaction.user}`,
                        '',
                        '*This is a fake ban. No actual action was taken. 😄*',
                    ].join('\n'),
                ),
            ],
        });
    },
};
