import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';
import { successEmbed, createEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('roleall')
        .setDescription('Add or remove a role from every member in the server')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add a role to all current members')
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('The role to add')
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove a role from all current members')
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    category: 'moderation',
    abuseProtection: { maxAttempts: 2, windowMs: 120_000 },

    async execute(interaction, _config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferSuccess) {
            logger.warn('Roleall interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole('role');
        const { guild } = interaction;

        // Validate role hierarchy
        if (role.position >= guild.members.me.roles.highest.position) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: `I can't manage **${role.name}** because it is equal to or higher than my highest role.`,
            });
        }

        if (role.managed) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: `**${role.name}** is a managed role (e.g. a bot role) and cannot be assigned manually.`,
            });
        }

        // Fetch all members
        let members;
        try {
            members = await guild.members.fetch();
        } catch (err) {
            logger.error(`[Roleall] Failed to fetch members for guild ${guild.id}:`, err);
            return replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Failed to fetch server members. Please try again.',
            });
        }

        const isAdd = subcommand === 'add';
        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (const [, member] of members) {
            if (member.user.bot) continue; // skip bots

            const hasRole = member.roles.cache.has(role.id);

            if (isAdd && hasRole) { skipped++; continue; }
            if (!isAdd && !hasRole) { skipped++; continue; }

            try {
                if (isAdd) {
                    await member.roles.add(role, `Roleall by ${interaction.user.tag}`);
                } else {
                    await member.roles.remove(role, `Roleall by ${interaction.user.tag}`);
                }
                success++;
            } catch (err) {
                logger.warn(`[Roleall] Failed to ${subcommand} role for member ${member.user.tag} (${member.id}): ${err.message}`);
                failed++;
            }
        }

        await logEvent({
            client,
            guild,
            event: {
                action: isAdd ? 'Role Added to All Members' : 'Role Removed from All Members',
                target: `${role.name} (${role.id})`,
                executor: `${interaction.user.tag} (${interaction.user.id})`,
                reason: `Roleall ${subcommand}`,
                metadata: {
                    roleId: role.id,
                    success,
                    skipped,
                    failed,
                    moderatorId: interaction.user.id,
                },
            },
        });

        const verb = isAdd ? 'added to' : 'removed from';
        const lines = [
            `✅ **${success}** member(s) — role ${verb}`,
            skipped > 0 ? `⏭️ **${skipped}** member(s) — already ${isAdd ? 'had' : 'lacked'} the role (skipped)` : null,
            failed > 0 ? `❌ **${failed}** member(s) — failed (likely hierarchy or permission issue)` : null,
        ].filter(Boolean);

        return InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    isAdd ? `Role Added — ${role.name}` : `Role Removed — ${role.name}`,
                    lines.join('\n'),
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};
