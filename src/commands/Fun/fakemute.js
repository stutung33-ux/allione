import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const DURATIONS = ['1 minute', '5 minutes', '10 minutes', '1 hour', '1 day', 'forever'];

export default {
    data: new SlashCommandBuilder()
        .setName('fakemute')
        .setDescription('Pretend to mute a user (fake, no actual action taken).')
        .addUserOption((o) =>
            o.setName('user').setDescription('The user to "mute"').setRequired(true),
        )
        .addStringOption((o) =>
            o.setName('reason').setDescription('Fake reason').setRequired(false).setMaxLength(200),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Talking too much';
        const duration = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                warningEmbed(
                    `🔇 ${target.username} has been muted!`,
                    [
                        `**User:** ${target} (${target.tag})`,
                        `**Duration:** ${duration}`,
                        `**Reason:** ${reason}`,
                        `**Muted by:** ${interaction.user}`,
                        '',
                        '*This is a fake mute. No actual action was taken. 😄*',
                    ].join('\n'),
                ),
            ],
        });
    },
};
