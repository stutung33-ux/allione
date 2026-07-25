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
        .setName('addrole')
        .setDescription('Give a role to a specific member.')
        .addUserOption((option) =>
            option
                .setName('member')
                .setDescription('The member to give the role to')
                .setRequired(true),
        )
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to assign')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('Reason for adding the role')
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
            logger.warn('Addrole interaction defer failed', {
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
                message: `**${role.name}** is a managed role (e.g. a bot integration role) and cannot be assigned manually.`,
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

        if (member.roles.cache.has(role.id)) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: `${member} already has the **${role.name}** role.`,
            });
        }

        try {
            await member.roles.add(role, `${reason} | by ${interaction.user.tag}`);
        } catch (err) {
            logger.warn(`[Addrole] Failed to add role ${role.id} for ${member.id}: ${err.message}`);
            return replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Failed to add the role. Check my permissions and role hierarchy.',
            });
        }

        await logEvent({
            client,
            guild,
            event: {
                action: 'Role Added',
                target: `${targetUser.tag} (${targetUser.id}) — ${role.name} (${role.id})`,
                executor: `${interaction.user.tag} (${interaction.user.id})`,
                reason,
                metadata: { roleId: role.id, memberId: targetUser.id },
            },
        });

        return InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    `Role Added — ${role.name}`,
                    `The **${role.name}** role has been given to ${member}.\n**Reason:** ${reason}`,
                ),
            ],
        });
    },
};
