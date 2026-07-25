import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder,
    LabelBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType,
    EmbedBuilder,
} from 'discord.js';
import { getColor, BotConfig } from '../../../config/bot.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { successEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { TitanBotError, ErrorTypes, replyUserError } from '../../../utils/errorHandler.js';
import { getEconomyPrefix } from '../../../utils/database.js';
import { getEconomyData, addMoney, removeMoney, getMaxBankCapacity } from '../../../utils/economy.js';
import { getEconomySettingsKey } from '../../../utils/database/keys.js';

/**
 * Retrieve per-guild currency settings from the DB, falling back to bot defaults.
 */
async function getGuildCurrencySettings(client, guildId) {
    const key = getEconomySettingsKey(guildId);
    const stored = await client.db.get(key, null);
    return {
        symbol: stored?.symbol ?? BotConfig.economy.currency.symbol,
        name: stored?.name ?? BotConfig.economy.currency.name,
    };
}

/**
 * Persist per-guild currency settings to the DB.
 */
async function saveGuildCurrencySettings(client, guildId, settings) {
    const key = getEconomySettingsKey(guildId);
    const current = await client.db.get(key, {});
    await client.db.set(key, { ...current, ...settings });
}

async function buildDashboardEmbed(guild, client) {
    const { symbol: currencySymbol, name: currencyName } = await getGuildCurrencySettings(client, guild.id);

    let totalInCirculation = 0;
    let userCount = 0;

    try {
        const economyKeys = await client.db.list(getEconomyPrefix(guild.id));

        if (economyKeys && economyKeys.length > 0) {
            for (const key of economyKeys) {
                const userId = key.split(':').pop();

                const member = await guild.members.fetch(userId).catch(() => null);
                if (member?.user?.bot) continue;

                const userData = await client.db.get(key, {});
                if (userData) {
                    totalInCirculation += (userData.wallet || 0) + (userData.bank || 0);
                    userCount++;
                }
            }
        }
    } catch (error) {
        logger.error('Error calculating economy stats:', error);
    }

    const avgBalance = userCount > 0 ? Math.floor(totalInCirculation / userCount) : 0;

    return new EmbedBuilder()
        .setTitle('💰 Economy Dashboard')
        .setDescription(`Manage the economy system for **${guild.name}**.\nSelect an option below to perform an action.`)
        .setColor(getColor('economy'))
        .addFields(
            { name: '💰 Total in Circulation', value: `\`${currencySymbol}${totalInCirculation.toLocaleString()}\``, inline: true },
            { name: '👥 Active Users', value: `\`${userCount.toLocaleString()}\``, inline: true },
            { name: '📊 Average Balance', value: `\`${currencySymbol}${avgBalance.toLocaleString()}\``, inline: true },
            { name: '💱 Currency Symbol', value: `\`${currencySymbol}\``, inline: true },
            { name: '📝 Currency Name', value: `\`${currencyName}\``, inline: true },
        )
        .setFooter({ text: 'Dashboard closes after 10 minutes of inactivity' })
        .setTimestamp();
}

function buildSelectMenu(guildId) {
    return new StringSelectMenuBuilder()
        .setCustomId(`economy_dashboard_${guildId}`)
        .setPlaceholder('Select an action...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Add Currency')
                .setDescription('Add currency to a user\'s wallet or bank')
                .setValue('add_currency')
                .setEmoji('💰'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Remove Currency')
                .setDescription('Remove currency from a user\'s wallet or bank')
                .setValue('remove_currency')
                .setEmoji('💸'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Change Currency Symbol')
                .setDescription('Change the currency symbol (e.g., $, €, £)')
                .setValue('change_currency')
                .setEmoji('💱'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Change Currency Name')
                .setDescription('Change the currency name (e.g., coins, credits)')
                .setValue('change_name')
                .setEmoji('📝'),
        );
}

async function refreshDashboard(rootInteraction, guild, client) {
    const selectMenu = buildSelectMenu(guild.id);
    await InteractionHelper.safeEditReply(rootInteraction, {
        embeds: [await buildDashboardEmbed(guild, client)],
        components: [
            new ActionRowBuilder().addComponents(selectMenu),
        ],
    }).catch(() => {});
}


export default {
    prefixOnly: false,
    async execute(interaction, config, client) {
        try {
            const guild = interaction.guild;
            const selectMenu = buildSelectMenu(guild.id);
            const selectRow = new ActionRowBuilder().addComponents(selectMenu);

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [await buildDashboardEmbed(guild, client)],
                components: [selectRow],
            });

            const collector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: i =>
                    i.user.id === interaction.user.id && i.customId === `economy_dashboard_${guild.id}`,
                time: 600_000,
            });

            collector.on('collect', async selectInteraction => {
                const selectedOption = selectInteraction.values[0];
                try {
                    switch (selectedOption) {
                        case 'add_currency':
                            await handleAddCurrency(selectInteraction, interaction, guild, client);
                            break;
                        case 'remove_currency':
                            await handleRemoveCurrency(selectInteraction, interaction, guild, client);
                            break;
                        case 'change_currency':
                            await handleChangeCurrency(selectInteraction, interaction, guild, client);
                            break;
                        case 'change_name':
                            await handleChangeName(selectInteraction, interaction, guild, client);
                            break;
                    }
                } catch (error) {
                    if (error instanceof TitanBotError) {
                        logger.debug(`Economy dashboard validation error: ${error.message}`);
                    } else {
                        logger.error('Unexpected economy dashboard error:', error);
                    }

                    const errorMessage =
                        error instanceof TitanBotError
                            ? error.userMessage || 'An error occurred while processing your selection.'
                            : 'An unexpected error occurred while processing your request.';

                    if (!selectInteraction.replied && !selectInteraction.deferred) {
                        await selectInteraction.deferUpdate().catch(() => {});
                    }

                    await replyUserError(selectInteraction, {
                        type: ErrorTypes.UNKNOWN,
                        message: errorMessage,
                    }).catch(() => {});
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('Dashboard Timed Out')
                        .setDescription('This dashboard has been closed due to inactivity. Please run the command again to continue.')
                        .setColor(getColor('error'));
                    
                    await InteractionHelper.safeEditReply(interaction, {
                        embeds: [timeoutEmbed],
                        components: [],
                    }).catch(() => {});
                }
            });
        } catch (error) {
            if (error instanceof TitanBotError) throw error;
            logger.error('Unexpected error in economy_dashboard:', error);
            throw new TitanBotError(
                `Economy dashboard failed: ${error.message}`,
                ErrorTypes.UNKNOWN,
                'Failed to open the economy dashboard.',
            );
        }
    },
};

async function handleAddCurrency(selectInteraction, rootInteraction, guild, client) {
    const modal = new ModalBuilder()
        .setCustomId(`economy_add_currency_${guild.id}`)
        .setTitle('Add Currency');

    const userSelect = new UserSelectMenuBuilder()
        .setCustomId('target_user')
        .setPlaceholder('Select a user...')
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true);

    const userLabel = new LabelBuilder()
        .setLabel('Target User')
        .setDescription('User to add currency to')
        .setUserSelectMenuComponent(userSelect);

    const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Amount to add')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('100')
        .setMinLength(1)
        .setMaxLength(10)
        .setRequired(true);

    const typeInput = new TextInputBuilder()
        .setCustomId('type')
        .setLabel('Type (wallet or bank)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('wallet')
        .setMinLength(1)
        .setMaxLength(5)
        .setRequired(true);

    modal.addLabelComponents(userLabel);
    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(typeInput),
    );

    await selectInteraction.showModal(modal);

    const submitted = await selectInteraction
        .awaitModalSubmit({
            filter: i => i.customId === `economy_add_currency_${guild.id}` && i.user.id === selectInteraction.user.id,
            time: 120_000,
        })
        .catch(() => null);

    if (!submitted) return;

    const userId = submitted.fields.getField('target_user').values[0];
    const amount = parseInt(submitted.fields.getTextInputValue('amount').trim(), 10);
    const type = submitted.fields.getTextInputValue('type').trim().toLowerCase();

    if (isNaN(amount) || amount <= 0) {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Amount must be a positive number.' });
        return;
    }

    if (type !== 'wallet' && type !== 'bank') {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Type must be either "wallet" or "bank".' });
        return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
        await replyUserError(submitted, { type: ErrorTypes.USER_INPUT, message: 'The specified user is not in this server.' });
        return;
    }

    if (member.user.bot) {
        await replyUserError(submitted, { type: ErrorTypes.UNKNOWN, message: 'Bots do not have economy accounts.' });
        return;
    }

    const { newBalance } = await addMoney(client, guild.id, userId, amount, type);

    const { symbol: currencySymbol } = await getGuildCurrencySettings(client, guild.id);

    await submitted.reply({
        embeds: [successEmbed('Currency Added', `Successfully added ${currencySymbol}${amount.toLocaleString()} to ${member.user.tag}'s ${type}.\n**New Balance:** ${currencySymbol}${newBalance.toLocaleString()}`)],
        flags: MessageFlags.Ephemeral,
    });

    logger.info(`[ECONOMY_DASHBOARD] Currency added`, {
        adminId: submitted.user.id,
        targetUserId: userId,
        amount,
        type,
        newBalance,
    });

    await refreshDashboard(rootInteraction, guild, client);
}

async function handleRemoveCurrency(selectInteraction, rootInteraction, guild, client) {
    const modal = new ModalBuilder()
        .setCustomId(`economy_remove_currency_${guild.id}`)
        .setTitle('Remove Currency');

    const userSelect = new UserSelectMenuBuilder()
        .setCustomId('target_user')
        .setPlaceholder('Select a user...')
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true);

    const userLabel = new LabelBuilder()
        .setLabel('Target User')
        .setDescription('User to remove currency from')
        .setUserSelectMenuComponent(userSelect);

    const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Amount to remove')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('100')
        .setMinLength(1)
        .setMaxLength(10)
        .setRequired(true);

    const typeInput = new TextInputBuilder()
        .setCustomId('type')
        .setLabel('Type (wallet or bank)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('wallet')
        .setMinLength(1)
        .setMaxLength(5)
        .setRequired(true);

    modal.addLabelComponents(userLabel);
    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(typeInput),
    );

    await selectInteraction.showModal(modal);

    const submitted = await selectInteraction
        .awaitModalSubmit({
            filter: i => i.customId === `economy_remove_currency_${guild.id}` && i.user.id === selectInteraction.user.id,
            time: 120_000,
        })
        .catch(() => null);

    if (!submitted) return;

    const userId = submitted.fields.getField('target_user').values[0];
    const amount = parseInt(submitted.fields.getTextInputValue('amount').trim(), 10);
    const type = submitted.fields.getTextInputValue('type').trim().toLowerCase();

    if (isNaN(amount) || amount <= 0) {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Amount must be a positive number.' });
        return;
    }

    if (type !== 'wallet' && type !== 'bank') {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Type must be either "wallet" or "bank".' });
        return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
        await replyUserError(submitted, { type: ErrorTypes.USER_INPUT, message: 'The specified user is not in this server.' });
        return;
    }

    if (member.user.bot) {
        await replyUserError(submitted, { type: ErrorTypes.UNKNOWN, message: 'Bots do not have economy accounts.' });
        return;
    }

    const { newBalance } = await removeMoney(client, guild.id, userId, amount, type);

    const { symbol: currencySymbol } = await getGuildCurrencySettings(client, guild.id);

    await submitted.reply({
        embeds: [successEmbed('Currency Removed', `Successfully removed ${currencySymbol}${amount.toLocaleString()} from ${member.user.tag}'s ${type}.\n**New Balance:** ${currencySymbol}${newBalance.toLocaleString()}`)],
        flags: MessageFlags.Ephemeral,
    });

    logger.info(`[ECONOMY_DASHBOARD] Currency removed`, {
        adminId: submitted.user.id,
        targetUserId: userId,
        amount,
        type,
        newBalance,
    });

    await refreshDashboard(rootInteraction, guild, client);
}

async function handleChangeCurrency(selectInteraction, rootInteraction, guild, client) {
    const { symbol: currentSymbol } = await getGuildCurrencySettings(client, guild.id);

    const modal = new ModalBuilder()
        .setCustomId(`economy_change_currency_${guild.id}`)
        .setTitle('Change Currency Symbol');

    const symbolInput = new TextInputBuilder()
        .setCustomId('currency_symbol')
        .setLabel('New Currency Symbol')
        .setStyle(TextInputStyle.Short)
        .setValue(currentSymbol)
        .setPlaceholder('$')
        .setMinLength(1)
        .setMaxLength(3)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(symbolInput));

    await selectInteraction.showModal(modal);

    const submitted = await selectInteraction
        .awaitModalSubmit({
            filter: i => i.customId === `economy_change_currency_${guild.id}` && i.user.id === selectInteraction.user.id,
            time: 120_000,
        })
        .catch(() => null);

    if (!submitted) return;

    const newSymbol = submitted.fields.getTextInputValue('currency_symbol').trim();

    if (newSymbol.length === 0 || newSymbol.length > 3) {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Currency symbol must be 1-3 characters long.' });
        return;
    }

    await saveGuildCurrencySettings(client, guild.id, { symbol: newSymbol });

    await submitted.reply({
        embeds: [successEmbed('Currency Symbol Updated', `Currency symbol changed to **${newSymbol}**. The dashboard will reflect the new symbol immediately.`)],
        flags: MessageFlags.Ephemeral,
    });

    logger.info(`[ECONOMY_DASHBOARD] Currency symbol changed`, {
        adminId: submitted.user.id,
        guildId: guild.id,
        oldSymbol: currentSymbol,
        newSymbol,
    });

    await refreshDashboard(rootInteraction, guild, client);
}

async function handleChangeName(selectInteraction, rootInteraction, guild, client) {
    const { name: currentName } = await getGuildCurrencySettings(client, guild.id);

    const modal = new ModalBuilder()
        .setCustomId(`economy_change_name_${guild.id}`)
        .setTitle('Change Currency Name');

    const nameInput = new TextInputBuilder()
        .setCustomId('currency_name')
        .setLabel('New Currency Name')
        .setStyle(TextInputStyle.Short)
        .setValue(currentName)
        .setPlaceholder('coins')
        .setMinLength(1)
        .setMaxLength(20)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

    await selectInteraction.showModal(modal);

    const submitted = await selectInteraction
        .awaitModalSubmit({
            filter: i => i.customId === `economy_change_name_${guild.id}` && i.user.id === selectInteraction.user.id,
            time: 120_000,
        })
        .catch(() => null);

    if (!submitted) return;

    const newName = submitted.fields.getTextInputValue('currency_name').trim();

    if (newName.length === 0 || newName.length > 20) {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Currency name must be 1-20 characters long.' });
        return;
    }

    await saveGuildCurrencySettings(client, guild.id, { name: newName });

    await submitted.reply({
        embeds: [successEmbed('Currency Name Updated', `Currency name changed to **${newName}**. The dashboard will reflect the new name immediately.`)],
        flags: MessageFlags.Ephemeral,
    });

    logger.info(`[ECONOMY_DASHBOARD] Currency name changed`, {
        adminId: submitted.user.id,
        guildId: guild.id,
        oldName: currentName,
        newName,
    });

    await refreshDashboard(rootInteraction, guild, client);
}