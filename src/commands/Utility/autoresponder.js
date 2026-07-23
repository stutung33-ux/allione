import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed, createEmbed, infoEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import {
    getAutoresponders,
    addAutoresponder,
    removeAutoresponder,
    clearAutoresponders,
} from '../../services/autoresponderService.js';
import { logger } from '../../utils/logger.js';

const MAX_AUTORESPONDERS = 25;

export default {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage automatic responses to trigger words/phrases')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add or update an autoresponder trigger')
                .addStringOption((o) =>
                    o.setName('trigger').setDescription('The word or phrase that triggers the response').setRequired(true).setMaxLength(100),
                )
                .addStringOption((o) =>
                    o.setName('response').setDescription('What the bot will reply with').setRequired(true).setMaxLength(500),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove an autoresponder trigger')
                .addStringOption((o) =>
                    o.setName('trigger').setDescription('The trigger to remove').setRequired(true).setMaxLength(100),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('list').setDescription('List all autoresponder triggers for this server'),
        )
        .addSubcommand((sub) =>
            sub.setName('clear').setDescription('Remove ALL autoresponder triggers for this server'),
        ),
    category: 'Utility',

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferSuccess) return;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: 'You need the **Manage Server** permission to manage autoresponders.',
            });
        }

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        try {
            if (sub === 'add') {
                const trigger = interaction.options.getString('trigger');
                const response = interaction.options.getString('response');

                const existing = await getAutoresponders(interaction.client, guildId);
                const normalizedTrigger = trigger.toLowerCase().trim();
                const isUpdate = existing.some((e) => e.trigger === normalizedTrigger);

                if (!isUpdate && existing.length >= MAX_AUTORESPONDERS) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: `You have reached the maximum of **${MAX_AUTORESPONDERS}** autoresponders. Remove one before adding more.`,
                    });
                }

                await addAutoresponder(interaction.client, guildId, trigger, response);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            isUpdate ? 'Autoresponder Updated' : 'Autoresponder Added',
                            `**Trigger:** \`${normalizedTrigger}\`\n**Response:** ${response}`,
                        ),
                    ],
                });
            }

            if (sub === 'remove') {
                const trigger = interaction.options.getString('trigger');
                const removed = await removeAutoresponder(interaction.client, guildId, trigger);

                if (!removed) {
                    return await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: `No autoresponder found for trigger \`${trigger.toLowerCase().trim()}\`.`,
                    });
                }

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('Autoresponder Removed', `Trigger \`${trigger.toLowerCase().trim()}\` has been removed.`)],
                });
            }

            if (sub === 'list') {
                const list = await getAutoresponders(interaction.client, guildId);

                if (!list.length) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [infoEmbed('No Autoresponders', 'This server has no autoresponders set up yet. Use `/autoresponder add` to create one.')],
                    });
                }

                const fields = list.map((entry, i) => ({
                    name: `${i + 1}. \`${entry.trigger}\``,
                    value: entry.response.length > 100 ? entry.response.slice(0, 97) + '...' : entry.response,
                    inline: false,
                }));

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        createEmbed({
                            title: `Autoresponders (${list.length}/${MAX_AUTORESPONDERS})`,
                            description: 'The bot replies when any of these triggers are found in a message.',
                            fields,
                            color: 'primary',
                        }),
                    ],
                });
            }

            if (sub === 'clear') {
                await clearAutoresponders(interaction.client, guildId);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('Autoresponders Cleared', 'All autoresponder triggers have been removed.')],
                });
            }
        } catch (error) {
            logger.error('Autoresponder command error:', error);
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Something went wrong while managing autoresponders.' });
        }
    },
};
