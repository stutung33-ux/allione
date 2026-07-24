import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/validation.js';

const TEXT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
];

export default {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Broadcast a message to channels or DM all members')
        .addSubcommand((sub) =>
            sub
                .setName('channel')
                .setDescription('Send a message to one or all text channels')
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('The message to broadcast')
                        .setRequired(true)
                        .setMaxLength(2000),
                )
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('Specific channel to send to (leave blank for all text channels)')
                        .addChannelTypes(...TEXT_CHANNEL_TYPES)
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('members')
                .setDescription('DM a message to all server members (bots excluded)')
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('The message to send to every member')
                        .setRequired(true)
                        .setMaxLength(2000),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    category: 'moderation',
    abuseProtection: { maxAttempts: 3, windowMs: 60_000 },

    async execute(interaction, _config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferSuccess) {
            logger.warn('Broadcast interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const rawMessage = interaction.options.getString('message');
        const message = sanitizeInput(rawMessage, 2000);

        if (!message) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Message cannot be empty.',
            });
        }

        // ── /broadcast channel ──────────────────────────────────────────────
        if (subcommand === 'channel') {
            const targetChannel = interaction.options.getChannel('channel');

            if (targetChannel) {
                const botPerms = targetChannel.permissionsFor(interaction.guild.members.me);
                if (!botPerms?.has(PermissionFlagsBits.SendMessages)) {
                    return replyUserError(interaction, {
                        type: ErrorTypes.PERMISSION,
                        message: `I do not have permission to send messages in ${targetChannel}.`,
                    });
                }

                const sent = await targetChannel.send({ content: message });

                await logEvent({
                    client,
                    guild: interaction.guild,
                    event: {
                        action: 'Broadcast Sent (Channel)',
                        target: `${targetChannel} (${targetChannel.id})`,
                        executor: `${interaction.user.tag} (${interaction.user.id})`,
                        reason: message.length > 200 ? `${message.slice(0, 197)}...` : message,
                        metadata: { channelId: targetChannel.id, messageId: sent.id },
                    },
                });

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('Broadcast Sent', `Message posted in ${targetChannel}. [Jump to message](${sent.url})`)],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // All text channels
            const channels = interaction.guild.channels.cache.filter(
                (ch) =>
                    TEXT_CHANNEL_TYPES.includes(ch.type) &&
                    ch.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.SendMessages),
            );

            if (channels.size === 0) {
                return replyUserError(interaction, {
                    type: ErrorTypes.PERMISSION,
                    message: 'I do not have permission to send messages in any text channel.',
                });
            }

            let sent = 0;
            let failed = 0;
            for (const [, channel] of channels) {
                try {
                    await channel.send({ content: message });
                    sent++;
                } catch (err) {
                    logger.warn(`[Broadcast] Failed to send to #${channel.name}: ${err.message}`);
                    failed++;
                }
            }

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Broadcast Sent (All Channels)',
                    target: `${sent} channel(s)`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: message.length > 200 ? `${message.slice(0, 197)}...` : message,
                    metadata: { sent, failed },
                },
            });

            const summary = failed > 0
                ? `Delivered to **${sent}** channel(s). Failed in **${failed}** channel(s) (missing permissions).`
                : `Delivered to **${sent}** channel(s) successfully.`;

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('Broadcast Complete', summary)],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── /broadcast members ───────────────────────────────────────────────
        if (subcommand === 'members') {
            let members;
            try {
                members = await interaction.guild.members.fetch();
            } catch (err) {
                logger.error(`[Broadcast] Failed to fetch members for guild ${interaction.guild.id}:`, err);
                return replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: 'Failed to fetch server members. Please try again.',
                });
            }

            const humans = members.filter((m) => !m.user.bot);
            let sent = 0;
            let failed = 0;

            for (const [, member] of humans) {
                try {
                    await member.send({ content: message });
                    sent++;
                } catch {
                    // Member has DMs closed or blocked the bot — expected
                    failed++;
                }
            }

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Broadcast Sent (All Members DM)',
                    target: `${sent} member(s)`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: message.length > 200 ? `${message.slice(0, 197)}...` : message,
                    metadata: { sent, failed },
                },
            });

            const summary = [
                `✅ **${sent}** member(s) received the DM.`,
                failed > 0 ? `❌ **${failed}** member(s) could not be reached (DMs closed or bot blocked).` : null,
            ].filter(Boolean).join('\n');

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('Member Broadcast Complete', summary)],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
