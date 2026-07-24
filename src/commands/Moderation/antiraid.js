import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
} from 'discord.js';
import { successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { resolveAntiRaidConfig, clearRaidState, isRaidActive } from '../../services/antiraidService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Configure and manage the anti-raid protection system')
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Enable anti-raid and set thresholds')
                .addIntegerOption((opt) =>
                    opt
                        .setName('threshold')
                        .setDescription('Number of joins within the window that triggers raid mode (default: 10)')
                        .setMinValue(3)
                        .setMaxValue(100)
                        .setRequired(false),
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('window')
                        .setDescription('Detection window in seconds (default: 10)')
                        .setMinValue(5)
                        .setMaxValue(120)
                        .setRequired(false),
                )
                .addStringOption((opt) =>
                    opt
                        .setName('action')
                        .setDescription('Action to take against raiders (default: kick)')
                        .addChoices(
                            { name: 'Kick', value: 'kick' },
                            { name: 'Ban', value: 'ban' },
                            { name: 'Log only (no action)', value: 'none' },
                        )
                        .setRequired(false),
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('min_account_age')
                        .setDescription('Only act on accounts younger than this many days (0 = all accounts, default: 7)')
                        .setMinValue(0)
                        .setMaxValue(365)
                        .setRequired(false),
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('cooldown')
                        .setDescription('How long raid mode stays active in seconds (default: 120)')
                        .setMinValue(30)
                        .setMaxValue(3600)
                        .setRequired(false),
                )
                .addChannelOption((opt) =>
                    opt
                        .setName('alert_channel')
                        .setDescription('Channel to send raid alerts to')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('disable')
                .setDescription('Disable anti-raid protection'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('status')
                .setDescription('Show current anti-raid configuration and raid mode status'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('clear')
                .setDescription('Manually clear active raid mode for this server'),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    category: 'moderation',

    async execute(interaction, _config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferSuccess) {
            logger.warn('Antiraid interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const { guild } = interaction;

        // ── /antiraid status ──────────────────────────────────────────────────
        if (subcommand === 'status') {
            const guildConfig = await getGuildConfig(client, guild.id);
            const cfg = resolveAntiRaidConfig(guildConfig);
            const raidMode = isRaidActive(guild.id);

            const alertChannel = cfg.alertChannelId
                ? guild.channels.cache.get(cfg.alertChannelId)
                : null;

            const lines = [
                `**Status:** ${cfg.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                `**Raid Mode:** ${raidMode ? '🚨 ACTIVE' : '✅ Inactive'}`,
                '',
                `**Threshold:** ${cfg.joinThreshold} joins within ${cfg.windowSeconds}s`,
                `**Action:** ${cfg.action === 'none' ? 'Log only' : cfg.action.charAt(0).toUpperCase() + cfg.action.slice(1)}`,
                `**Min Account Age:** ${cfg.minAccountAgeDays === 0 ? 'Any age' : `${cfg.minAccountAgeDays} day(s)`}`,
                `**Raid Cooldown:** ${cfg.raidCooldownSeconds}s`,
                `**Alert Channel:** ${alertChannel ? alertChannel.toString() : 'Not set'}`,
            ].join('\n');

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed('Anti-Raid Status', lines)],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── /antiraid clear ───────────────────────────────────────────────────
        if (subcommand === 'clear') {
            const wasActive = isRaidActive(guild.id);
            clearRaidState(guild.id);
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        'Raid Mode Cleared',
                        wasActive
                            ? 'Raid mode has been manually cleared. Join tracking has been reset.'
                            : 'No active raid mode was found. Join tracking has been reset.',
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── /antiraid disable ─────────────────────────────────────────────────
        if (subcommand === 'disable') {
            await patchGuildConfig(client, guild.id, { antiraid: { enabled: false } });
            clearRaidState(guild.id);
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [warningEmbed('Anti-Raid Disabled', 'Anti-raid protection has been turned off for this server.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── /antiraid setup ───────────────────────────────────────────────────
        if (subcommand === 'setup') {
            const guildConfig = await getGuildConfig(client, guild.id);
            const current = resolveAntiRaidConfig(guildConfig);

            const joinThreshold = interaction.options.getInteger('threshold') ?? current.joinThreshold;
            const windowSeconds = interaction.options.getInteger('window') ?? current.windowSeconds;
            const action = interaction.options.getString('action') ?? current.action;
            const minAccountAgeDays = interaction.options.getInteger('min_account_age') ?? current.minAccountAgeDays;
            const raidCooldownSeconds = interaction.options.getInteger('cooldown') ?? current.raidCooldownSeconds;
            const alertChannel = interaction.options.getChannel('alert_channel');

            const alertChannelId = alertChannel
                ? alertChannel.id
                : current.alertChannelId;

            // Validate alert channel permissions
            if (alertChannel) {
                const botPerms = alertChannel.permissionsFor(guild.members.me);
                if (!botPerms?.has(['SendMessages', 'EmbedLinks'])) {
                    return replyUserError(interaction, {
                        type: ErrorTypes.PERMISSION,
                        message: `I do not have permission to send messages in ${alertChannel}. Please choose a channel I can access.`,
                    });
                }
            }

            const newCfg = {
                enabled: true,
                joinThreshold,
                windowSeconds,
                action,
                minAccountAgeDays,
                alertChannelId,
                raidCooldownSeconds,
            };

            await patchGuildConfig(client, guild.id, { antiraid: newCfg });

            const channel = alertChannelId ? guild.channels.cache.get(alertChannelId) : null;
            const summary = [
                `Anti-raid protection is now **active**.`,
                '',
                `**Threshold:** ${joinThreshold} joins within ${windowSeconds}s`,
                `**Action:** ${action === 'none' ? 'Log only (no kick/ban)' : action.charAt(0).toUpperCase() + action.slice(1)}`,
                `**Min Account Age:** ${minAccountAgeDays === 0 ? 'Any age' : `${minAccountAgeDays} day(s)`}`,
                `**Raid Cooldown:** ${raidCooldownSeconds}s`,
                `**Alert Channel:** ${channel ? channel.toString() : 'Not set'}`,
            ].join('\n');

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('Anti-Raid Configured', summary)],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
