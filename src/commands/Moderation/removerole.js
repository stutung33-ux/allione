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

export default {
    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Remove a role from a specific member.')
        .addUserOption((option) =>
            option
                .setName('member')
                .setDescription('The member to remove the role from')
                .setRequired(true),
        )
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to remove')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('Reason for removing the role')
                .setRequired(false)
                .setMaxLength(512),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .setDMPermission(false),
    category: 'moderation',

    async execute(interaction, _config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferSuccess) {
            logger.warn('Removerole interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
            });
            return;
        }

        const targetUser = interaction.options.getUser('member');
        const role = interaction.options.getRole('role');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const { guild } = interaction;

        // Prevent editing the server owner
        if (targetUser.id === guild.ownerId) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: 'You cannot manage roles for the server owner.',
            });
        }

        // Bot hierarchy check
        if (role.position >= guild.members.me.roles.highest.position) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: `I cannot manage **${role.name}** because it is equal to or higher than my highest role.`,
            });
        }

        // Managed role check
        if (role.managed) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: `**${role.name}** is a managed role and cannot be removed manually.`,
            });
        }

        // Executor hierarchy check — prevent privilege escalation
        const executor = interaction.member;
        if (
            role.position >= executor.roles.highest.position &&
            guild.ownerId !== interaction.user.id
        ) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: `You cannot manage **${role.name}** because it is equal to or higher than your highest role.`,
            });
        }

        // Fetch target member
        let member;
        try {
            member = await guild.members.fetch(targetUser.id);
        } catch {
            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: `Could not find **${targetUser.tag}** in this server.`,
                subtype: 'invalid_user',
            });
        }

        if (!member.roles.cache.has(role.id)) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: `${member} does not have the **${role.name}** role.`,
            });
        }

        try {
            await member.roles.remove(role, `${reason} | by ${interaction.user.tag}`);
        } catch (err) {
            logger.warn(`[Removerole] Failed to remove role ${role.id} from ${member.id}: ${err.message}`);
            return replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Failed to remove the role. Check my permissions and role hierarchy.',
            });
        }

        await logEvent({
            client,
            guild,
            event: {
                action: 'Role Removed',
                target: `${targetUser.tag} (${targetUser.id}) — ${role.name} (${role.id})`,
                executor: `${interaction.user.tag} (${interaction.user.id})`,
                reason,
                metadata: { roleId: role.id, memberId: targetUser.id },
            },
        });

        return InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    `Role Removed — ${role.name}`,
                    `The **${role.name}** role has been removed from ${member}.\n**Reason:** ${reason}`,
                ),
            ],
        });
    },
};
