import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

async function applyRole(member, role, isAdd, tagger) {
    try {
        if (isAdd) {
            await member.roles.add(role, `Roleall by ${tagger}`);
        } else {
            await member.roles.remove(role, `Roleall by ${tagger}`);
        }
        return 'success';
    } catch {
        return 'failed';
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('roleall')
        .setDescription('Add or remove a role from a specific member or every member')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add a role to a specific member or all members')
                .addRoleOption((option) =>
                    option.setName('role').setDescription('The role to add').setRequired(true),
                )
                .addUserOption((option) =>
                    option
                        .setName('member')
                        .setDescription('Target member (leave blank to add to all members)')
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove a role from a specific member or all members')
                .addRoleOption((option) =>
                    option.setName('role').setDescription('The role to remove').setRequired(true),
                )
                .addUserOption((option) =>
                    option
                        .setName('member')
                        .setDescription('Target member (leave blank to remove from all members)')
                        .setRequired(false),
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
        const targetUser = interaction.options.getUser('member');
        const { guild } = interaction;
        const isAdd = subcommand === 'add';
        const tagger = interaction.user.tag;

        // Validate role
        if (role.position >= guild.members.me.roles.highest.position) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: `I can't manage **${role.name}** because it is equal to or higher than my highest role.`,
            });
        }
        if (role.managed) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: `**${role.name}** is a managed role (e.g. a bot integration role) and cannot be assigned manually.`,
            });
        }

        // ── Single member ─────────────────────────────────────────────────
        if (targetUser) {
            let member;
            try {
                member = await guild.members.fetch(targetUser.id);
            } catch {
                return replyUserError(interaction, {
                    type: ErrorTypes.USER_INPUT,
                    message: `Could not find **${targetUser.tag}** in this server.`,
                });
            }

            const hasRole = member.roles.cache.has(role.id);
            if (isAdd && hasRole) {
                return replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: `${member} already has the **${role.name}** role.`,
                });
            }
            if (!isAdd && !hasRole) {
                return replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: `${member} does not have the **${role.name}** role.`,
                });
            }

            const result = await applyRole(member, role, isAdd, tagger);
            if (result === 'failed') {
                return replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: `Failed to ${isAdd ? 'add' : 'remove'} the role. Check my permissions and role hierarchy.`,
                });
            }

            await logEvent({
                client,
                guild,
                event: {
                    action: isAdd ? 'Role Added (Single Member)' : 'Role Removed (Single Member)',
                    target: `${targetUser.tag} (${targetUser.id}) — ${role.name}`,
                    executor: `${tagger} (${interaction.user.id})`,
                    reason: `Roleall ${subcommand}`,
                    metadata: { roleId: role.id, memberId: targetUser.id },
                },
            });

            const verb = isAdd ? 'added to' : 'removed from';
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(
                    isAdd ? `Role Added — ${role.name}` : `Role Removed — ${role.name}`,
                    `✅ Role **${role.name}** ${verb} ${member}.`,
                )],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── All members ───────────────────────────────────────────────────
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

        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (const [, member] of members) {
            if (member.user.bot) continue;

            const hasRole = member.roles.cache.has(role.id);
            if (isAdd && hasRole) { skipped++; continue; }
            if (!isAdd && !hasRole) { skipped++; continue; }

            const result = await applyRole(member, role, isAdd, tagger);
            if (result === 'success') { success++; } else { failed++; }
        }

        await logEvent({
            client,
            guild,
            event: {
                action: isAdd ? 'Role Added (All Members)' : 'Role Removed (All Members)',
                target: `${role.name} (${role.id})`,
                executor: `${tagger} (${interaction.user.id})`,
                reason: `Roleall ${subcommand}`,
                metadata: { roleId: role.id, success, skipped, failed },
            },
        });

        const verb = isAdd ? 'added to' : 'removed from';
        const lines = [
            `✅ **${success}** member(s) — role ${verb}`,
            skipped > 0 ? `⏭️ **${skipped}** member(s) — already ${isAdd ? 'had' : 'lacked'} the role (skipped)` : null,
            failed > 0 ? `❌ **${failed}** member(s) — failed (hierarchy or permission issue)` : null,
        ].filter(Boolean);

        return InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed(
                isAdd ? `Role Added — ${role.name}` : `Role Removed — ${role.name}`,
                lines.join('\n'),
            )],
            flags: MessageFlags.Ephemeral,
        });
    },
};
