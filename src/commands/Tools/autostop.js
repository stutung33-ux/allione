/**
 * /autostop — Owner-only command that cancels the currently running
 * AutoSend session (if any).
 *
 * Sets the cancellation flag on the shared session object so the
 * /autosend loop detects it on its next cycle check and exits cleanly.
 */

import {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { getSession, clearSession } from '../../utils/autosendSessions.js';
import botConfig from '../../config/bot.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the interaction user is a registered bot owner.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
function isOwner(interaction) {
    const owners = botConfig.commands?.owners ?? [];
    return owners.includes(interaction.user.id);
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export default {
    data: new SlashCommandBuilder()
        .setName('autostop')
        .setDescription('(Owner only) Stops the currently running AutoSend session.')
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

        // ── Defer ephemerally ──────────────────────────────────────────────
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferred) {
            logger.warn('[AutoStop] Interaction defer failed', { userId: interaction.user.id });
            return;
        }

        // ── Look up the active session ─────────────────────────────────────
        const session = getSession();

        if (!session) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed('No Active Session', 'There is no active AutoSend session to stop.')],
            });
        }

        // ── Signal cancellation ────────────────────────────────────────────
        // The /autosend loop polls session.cancelled; setting this flag causes
        // it to exit after its current sleep interval (≤250 ms).
        session.cancelled = true;
        session.running   = false;

        const progressInfo = session.current > 0
            ? `Stopped after sending **${session.current}** of **${session.total}** message(s) in <#${session.channelId}>.`
            : `Stopped before any messages were sent in <#${session.channelId}>.`;

        // Remove the session immediately so the owner can start a new one
        clearSession();

        logger.info('[AutoStop] Session cancelled by owner', {
            ownerId:    interaction.user.id,
            channelId:  session.channelId,
            sentSoFar:  session.current,
            total:      session.total,
        });

        return InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed('AutoSend Cancelled', `🛑 ${progressInfo}`)],
        });
    },
};
