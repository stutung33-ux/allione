import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';
import { successEmbed, infoEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

/**
 * Sanitize broadcast message: trim, enforce max length, strip NUL and DEL
 * but PRESERVE newlines and other printable whitespace so multi-line
 * messages are sent as intended.
 */
function sanitizeBroadcastMessage(input, maxLength = 2000) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .substring(0, maxLength)
        .replace(/[\x00\x7F]/g, ''); // NUL + DEL only — keep \n, \r, \t
}

/** Wait for ms milliseconds (used to respect Discord rate limits). */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Delay between successive channel/DM sends to avoid hitting Discord rate limits. */
const SEND_DELAY_MS = 500;

/** How often (in members) to push a progress update back to the executor. */
const PROGRESS_EVERY = 25;

const TEXT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
];

/** Format elapsed milliseconds into a human-readable string like "1m 23s". */
function formatElapsed(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

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
        const message = sanitizeBroadcastMessage(rawMessage, 2000);

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

            // Show initial progress embed
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed('Broadcasting…', `Sending to **0/${channels.size}** channels…`)],
            });

            const startTime = Date.now();
            let sent = 0;
            let failed = 0;
            let processed = 0;

            for (const [, channel] of channels) {
                try {
                    await channel.send({ content: message });
                    sent++;
                } catch (err) {
                    logger.warn(`[Broadcast] Failed to send to #${channel.name}: ${err.message}`);
                    failed++;
                }
                processed++;

                // Periodic progress update
                if (processed % PROGRESS_EVERY === 0 || processed === channels.size) {
                    await InteractionHelper.safeEditReply(interaction, {
                        embeds: [infoEmbed('Broadcasting…', `Sending to **${processed}/${channels.size}** channels… (✅ ${sent} sent, ❌ ${failed} failed)`)],
                    }).catch(() => {/* non-fatal */});
                }

                await sleep(SEND_DELAY_MS);
            }

            const elapsed = formatElapsed(Date.now() - startTime);

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Broadcast Sent (All Channels)',
                    target: `${sent} channel(s)`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: message.length > 200 ? `${message.slice(0, 197)}...` : message,
                    metadata: { sent, failed, total: channels.size, elapsed },
                },
            });

            const summary = [
                `✅ **${sent}** channel(s) received the message.`,
                failed > 0 ? `❌ **${failed}** channel(s) failed (missing permissions).` : null,
                `📊 **${channels.size}** total channels processed in **${elapsed}**.`,
            ].filter(Boolean).join('\n');

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('Channel Broadcast Complete', summary)],
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
            const total = humans.size;

            if (total === 0) {
                return replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'No non-bot members found in this server.',
                });
            }

            // Show initial progress embed so the user knows it started
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed('Broadcasting…', `Sending DMs to **0/${total}** members… This may take a while.`)],
            });

            const startTime = Date.now();
            let sent = 0;
            let failed = 0;
            let processed = 0;

            for (const [, member] of humans) {
                try {
                    await member.send({ content: message });
                    sent++;
                } catch {
                    // Member has DMs closed or blocked the bot — expected and non-fatal
                    failed++;
                }
                processed++;

                // Periodic progress update every PROGRESS_EVERY members
                if (processed % PROGRESS_EVERY === 0 || processed === total) {
                    await InteractionHelper.safeEditReply(interaction, {
                        embeds: [infoEmbed('Broadcasting…', `Sending DMs to **${processed}/${total}** members… (✅ ${sent} sent, ❌ ${failed} failed)`)],
                    }).catch(() => {/* non-fatal — interaction may have timed out */});
                }

                // Respect Discord rate limits between successive DM sends
                await sleep(SEND_DELAY_MS);
            }

            const elapsed = formatElapsed(Date.now() - startTime);

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Broadcast Sent (All Members DM)',
                    target: `${sent} member(s)`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: message.length > 200 ? `${message.slice(0, 197)}...` : message,
                    metadata: { sent, failed, total, elapsed },
                },
            });

            const summary = [
                `✅ **${sent}** member(s) received the DM.`,
                failed > 0 ? `❌ **${failed}** member(s) could not be reached (DMs closed or bot blocked).` : null,
                `📊 **${total}** total members processed in **${elapsed}**.`,
            ].filter(Boolean).join('\n');

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('Member Broadcast Complete', summary)],
            });
        }
    },
};
