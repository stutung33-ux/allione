/**
 * /autosend — Owner-only command that sends a message N times with a
 * configurable delay between each send.
 *
 * Constraints:
 *   - count  : 1–5
 *   - delay  : 1–10 seconds
 *   - Only one global AutoSend session may run at a time.
 *   - Only the bot owner (OWNER_IDS env var) may use this command.
 */

import {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { getSession, createSession, clearSession } from '../../utils/autosendSessions.js';
import botConfig from '../../config/bot.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the interaction user is a registered bot owner.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
function isOwner(interaction) {
    const owners = botConfig.commands?.owners ?? [];
    return owners.includes(interaction.user.id);
}

/**
 * Cancellation-aware sleep.
 * Resolves after `ms` milliseconds, but polls every 250 ms so
 * /autostop can interrupt the delay without a long wait.
 *
 * @param {number}            ms      - Total milliseconds to wait
 * @param {() => boolean}     isCancelled - Returns true if the session was cancelled
 */
async function cancellableSleep(ms, isCancelled) {
    const interval = 250;
    const steps = Math.ceil(ms / interval);

    for (let i = 0; i < steps; i++) {
        if (isCancelled()) return;
        await new Promise((resolve) => setTimeout(resolve, Math.min(interval, ms - i * interval)));
    }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates slash-command options and returns a structured result.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {{ valid: boolean, message?: string, count?: number, delay?: number, text?: string }}
 */
function validateOptions(interaction) {
    const text  = interaction.options.getString('message', true);
    const count = interaction.options.getInteger('count',   true);
    const delay = interaction.options.getInteger('delay',   true);

    if (count < 1 || count > 5) {
        return {
            valid: false,
            message: `**Invalid count.** The maximum allowed is **5** messages per session. You provided \`${count}\`.`,
        };
    }

    if (delay < 1 || delay > 10) {
        return {
            valid: false,
            message: `**Invalid delay.** The delay must be between **1** and **10** seconds. You provided \`${delay}\`.`,
        };
    }

    if (!text || text.trim().length === 0) {
        return { valid: false, message: '**Invalid message.** The message cannot be empty.' };
    }

    return { valid: true, text: text.trim(), count, delay };
}

// ---------------------------------------------------------------------------
// Core send loop
// ---------------------------------------------------------------------------

/**
 * Runs the send loop for the active session.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {string}                           text
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function runSendLoop(channel, text, interaction) {
    const session = getSession();

    try {
        for (let i = 1; i <= session.total; i++) {
            // Check for cancellation before each send
            if (session.cancelled) break;

            session.current = i;

            // Attempt to send; catch per-message errors so the loop can continue
            try {
                await channel.send({ content: text });
                logger.info(`[AutoSend] Sent message ${i}/${session.total} to #${channel.name} (${channel.id})`);
            } catch (sendErr) {
                logger.error('[AutoSend] Failed to send a message', {
                    messageIndex: i,
                    channelId: channel.id,
                    error: sendErr.message,
                });

                // Notify the owner about the failed send, then continue
                try {
                    await interaction.followUp({
                        embeds: [errorEmbed(
                            'Send Failed',
                            `Message ${i}/${session.total} could not be sent: ${sendErr.message}`,
                        )],
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (_) { /* follow-up may fail if interaction expired */ }
            }

            // Wait between messages (skip after the last one)
            if (i < session.total) {
                await cancellableSleep(session.delayMs, () => session.cancelled);
            }

            // Re-check cancellation after the delay
            if (session.cancelled) break;
        }

        // ── Post-loop outcome ──────────────────────────────────────────────
        if (session.cancelled) {
            // Cancellation confirmed — /autostop already sent the reply, so just log
            logger.info('[AutoSend] Session was cancelled mid-loop; loop exiting cleanly.');
        } else {
            // Completed naturally — notify the owner
            try {
                await interaction.followUp({
                    embeds: [successEmbed(
                        'AutoSend Complete',
                        `✅ Successfully sent **${session.total}** message(s) in <#${channel.id}>.`,
                    )],
                    flags: MessageFlags.Ephemeral,
                });
            } catch (followUpErr) {
                logger.warn('[AutoSend] Could not send completion follow-up', { error: followUpErr.message });
            }

            logger.info(`[AutoSend] Session completed — ${session.total} message(s) sent to #${channel.name}.`);
        }
    } catch (loopErr) {
        // Unexpected error inside the loop — clean up and inform the owner
        logger.error('[AutoSend] Unexpected error in send loop', { error: loopErr.message, stack: loopErr.stack });

        try {
            await interaction.followUp({
                embeds: [errorEmbed(
                    'AutoSend Error',
                    `An unexpected error occurred and the session has been stopped: \`${loopErr.message}\``,
                )],
                flags: MessageFlags.Ephemeral,
            });
        } catch (_) { /* follow-up may fail if interaction expired */ }
    } finally {
        // Always clean up the session, even on error
        clearSession();
    }
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export default {
    data: new SlashCommandBuilder()
        .setName('autosend')
        .setDescription('(Owner only) Sends a message multiple times with a configurable delay.')
        .addStringOption((opt) =>
            opt
                .setName('message')
                .setDescription('The message to send repeatedly.')
                .setRequired(true)
                .setMaxLength(2000),
        )
        .addIntegerOption((opt) =>
            opt
                .setName('count')
                .setDescription('How many times to send the message (1–5).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5),
        )
        .addIntegerOption((opt) =>
            opt
                .setName('delay')
                .setDescription('Seconds to wait between each message (1–10).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10),
        )
        // Restrict visibility to admins in the client; owner check is enforced in code
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    category: 'tools',

    async execute(interaction) {
        // ── Owner guard ────────────────────────────────────────────────────
        if (!isOwner(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Unauthorized', 'You are not authorized to use this command.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── Defer so we have time for validation + loop ────────────────────
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferred) {
            logger.warn('[AutoSend] Interaction defer failed', { userId: interaction.user.id });
            return;
        }

        // ── Input validation ───────────────────────────────────────────────
        const validation = validateOptions(interaction);
        if (!validation.valid) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Invalid Input', validation.message)],
            });
        }

        const { text, count, delay } = validation;

        // ── Session guard (only one global session at a time) ─────────────
        if (getSession()) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed(
                    'Session Already Active',
                    'An AutoSend session is currently running. Use `/autostop` to cancel it first.',
                )],
            });
        }

        // ── Channel permission check ───────────────────────────────────────
        const channel = interaction.channel;
        if (!channel) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Channel Error', 'Could not resolve the current channel.')],
            });
        }

        const botPerms = channel.permissionsFor(interaction.guild?.members?.me);
        if (!botPerms?.has(PermissionFlagsBits.SendMessages)) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed(
                    'Missing Permissions',
                    `I don't have permission to send messages in <#${channel.id}>.`,
                )],
            });
        }

        // ── Create the session ─────────────────────────────────────────────
        createSession({
            channelId: channel.id,
            ownerId:   interaction.user.id,
            current:   0,
            total:     count,
            delayMs:   delay * 1000,
        });

        logger.info('[AutoSend] Session started', {
            channelId: channel.id,
            ownerId:   interaction.user.id,
            count,
            delaySeconds: delay,
        });

        // ── Confirm start to the owner ─────────────────────────────────────
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed(
                'AutoSend Started',
                `📤 Sending **${count}** message(s) to <#${channel.id}> with a **${delay}s** delay between each.\n\nUse \`/autostop\` to cancel at any time.`,
            )],
        });

        // ── Run the loop (non-blocking relative to the slash command reply) ─
        // We intentionally do NOT await this so the command returns immediately
        // and the loop runs in the background. Follow-ups are used for status.
        runSendLoop(channel, text, interaction);
    },
};
