/**
 * antiraidService.js
 *
 * Tracks join rates per guild and triggers lockdown when a raid is detected.
 *
 * Detection logic:
 *   - Maintain a sliding window of join timestamps per guild.
 *   - If joinThreshold or more joins occur within windowSeconds seconds → raid detected.
 *   - In raid mode: apply the configured action (kick / ban) to new joiners whose accounts
 *     are younger than minAccountAgeDays days.
 *   - Alert the configured alert channel.
 *   - Raid mode clears automatically after raidCooldownSeconds seconds of normal activity.
 *
 * Config shape stored in guildConfig.antiraid:
 * {
 *   enabled: boolean,
 *   joinThreshold: number,   // how many joins …
 *   windowSeconds: number,   //  … within this many seconds triggers a raid
 *   action: 'kick' | 'ban' | 'none',  // what to do to new joiners during a raid
 *   minAccountAgeDays: number, // only act on accounts younger than this (0 = all)
 *   alertChannelId: string | null,
 *   raidCooldownSeconds: number, // how long raid mode stays active
 * }
 */

import { logger } from '../utils/logger.js';
import { getGuildConfig } from './config/guildConfig.js';

// In-memory join tracking: guildId → sorted array of join timestamps (ms)
const joinWindows = new Map();

// In-memory raid state: guildId → { active: boolean, expiresAt: number }
const raidState = new Map();

const DEFAULT_CONFIG = {
    enabled: false,
    joinThreshold: 10,
    windowSeconds: 10,
    action: 'kick',
    minAccountAgeDays: 7,
    alertChannelId: null,
    raidCooldownSeconds: 120,
};

/**
 * Merge stored config with defaults so every field is always present.
 */
export function resolveAntiRaidConfig(guildConfig) {
    return { ...DEFAULT_CONFIG, ...(guildConfig?.antiraid || {}) };
}

/**
 * Record a join and return { isRaid, config }.
 */
export function recordJoin(guildId, guildConfig) {
    const cfg = resolveAntiRaidConfig(guildConfig);

    if (!cfg.enabled) return { isRaid: false, config: cfg };

    const now = Date.now();
    const windowMs = cfg.windowSeconds * 1000;

    // Purge old timestamps
    const timestamps = (joinWindows.get(guildId) || []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    joinWindows.set(guildId, timestamps);

    const isRaid = timestamps.length >= cfg.joinThreshold;

    if (isRaid) {
        const expiry = now + cfg.raidCooldownSeconds * 1000;
        const existing = raidState.get(guildId);
        // Extend raid mode on every new detection hit
        raidState.set(guildId, { active: true, expiresAt: Math.max(existing?.expiresAt ?? 0, expiry) });
    }

    return { isRaid, config: cfg };
}

/**
 * Returns true when a guild is currently in raid mode.
 */
export function isRaidActive(guildId) {
    const state = raidState.get(guildId);
    if (!state?.active) return false;
    if (Date.now() > state.expiresAt) {
        raidState.delete(guildId);
        return false;
    }
    return true;
}

/**
 * Manually clear raid mode for a guild (used by /antiraid clear).
 */
export function clearRaidState(guildId) {
    raidState.delete(guildId);
    joinWindows.delete(guildId);
}

/**
 * Apply the configured anti-raid action to a member.
 * Returns 'kicked' | 'banned' | 'skipped' | 'none'.
 */
export async function applyRaidAction(member, cfg) {
    const { action, minAccountAgeDays } = cfg;

    if (action === 'none') return 'none';

    // Account-age gate
    if (minAccountAgeDays > 0) {
        const ageMs = Date.now() - member.user.createdTimestamp;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays >= minAccountAgeDays) return 'skipped'; // account is old enough
    }

    try {
        if (action === 'ban') {
            await member.ban({ reason: '[TitanBot Anti-Raid] Automatic ban during raid', deleteMessageSeconds: 0 });
            return 'banned';
        } else {
            await member.kick('[TitanBot Anti-Raid] Automatic kick during raid');
            return 'kicked';
        }
    } catch (err) {
        logger.warn(`[AntiRaid] Could not ${action} member ${member.id}: ${err.message}`);
        return 'none';
    }
}

/**
 * Send an alert to the configured channel.
 */
export async function sendRaidAlert(client, guild, cfg, member, actionResult, joinCount) {
    const { alertChannelId } = cfg;
    if (!alertChannelId) return;

    const channel = guild.channels.cache.get(alertChannelId);
    if (!channel?.isTextBased()) return;

    const botPerms = channel.permissionsFor(guild.members.me);
    if (!botPerms?.has(['SendMessages', 'EmbedLinks'])) return;

    const { EmbedBuilder } = await import('discord.js');

    const actionText =
        actionResult === 'banned' ? '🔨 Banned'
            : actionResult === 'kicked' ? '👢 Kicked'
                : actionResult === 'skipped' ? '⏭️ Skipped (account age OK)'
                    : '⚠️ No action taken';

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚨 RAID DETECTED')
        .setDescription(
            `**${joinCount}** users joined within **${cfg.windowSeconds}s** — raid mode is active for **${cfg.raidCooldownSeconds}s**.`,
        )
        .addFields(
            { name: 'Latest Joiner', value: `${member.user.tag} (${member.id})`, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Action Taken', value: actionText, inline: true },
        )
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        logger.warn(`[AntiRaid] Could not send alert: ${err.message}`);
    }
}
