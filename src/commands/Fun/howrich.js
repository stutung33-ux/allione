import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function richBar(pct) {
    const filled = Math.round(pct / 10);
    return '💰'.repeat(filled) + '🪙'.repeat(10 - filled);
}

export default {
    data: new SlashCommandBuilder()
        .setName('howrich')
        .setDescription('Find out how rich someone is (just for fun!).')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to check (defaults to you)').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user') ?? interaction.user;
        const pct = Math.floor(Math.random() * 101);
        const netWorth = (Math.random() * 10_000_000).toFixed(2);
        const label =
            pct < 20 ? 'Broke. Check the couch cushions.' :
            pct < 50 ? 'Getting by.' :
            pct < 75 ? 'Doing well!' :
            pct < 90 ? 'Pretty wealthy!' :
            'Billionaire behavior. 💸';

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    `💰 Wealth Meter — ${target.username}`,
                    `${richBar(pct)}\n\n**${pct}% rich** — ${label}\n*Estimated net worth: $${Number(netWorth).toLocaleString()}*`,
                ),
            ],
        });
    },
};
