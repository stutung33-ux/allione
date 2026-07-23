import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed, createEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { setAFK, getAFK } from '../../services/afkService.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your AFK status so others know you\'re away')
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('Why are you going AFK? (optional)')
                .setMaxLength(200),
        ),
    category: 'Utility',

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferSuccess) return;

        try {
            const existing = await getAFK(interaction.client, interaction.guildId, interaction.user.id);
            if (existing) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'You are already AFK! Send a message in any channel to remove your AFK status.',
                });
            }

            const reason = interaction.options.getString('reason') || 'No reason provided';
            await setAFK(interaction.client, interaction.guildId, interaction.user.id, reason);

            // Attempt to prefix nickname with [AFK]
            const member = interaction.member;
            if (member && member.manageable && !member.displayName.startsWith('[AFK]')) {
                await member.setNickname(`[AFK] ${member.displayName}`).catch(() => {});
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        'AFK Status Set',
                        `You are now AFK.\n**Reason:** ${reason}\n\nSend any message in this server to remove your AFK status.`,
                    ),
                ],
            });

            logger.info(`AFK set`, { userId: interaction.user.id, guildId: interaction.guildId, reason });
        } catch (error) {
            logger.error('AFK command error:', error);
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Something went wrong while setting your AFK status.' });
        }
    },
};
