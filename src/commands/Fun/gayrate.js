import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function progressBar(pct) {
    const filled = Math.round(pct / 10);
    return '🌈'.repeat(filled) + '⬜'.repeat(10 - filled);
}

export default {
    data: new SlashCommandBuilder()
        .setName('gayrate')
        .setDescription('Find out how gay someone is (just for fun!).')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to check (defaults to you)').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user') ?? interaction.user;
        const pct = Math.floor(Math.random() * 101);
        const label =
            pct < 20 ? 'Completely straight.' :
            pct < 50 ? 'A little curious…' :
            pct < 75 ? 'Pretty gay ngl.' :
            pct < 90 ? 'Very gay!' :
            'Maximum rainbow energy! 🌈';

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    `🌈 Gay Rate — ${target.username}`,
                    `${progressBar(pct)}\n\n**${pct}% gay** — ${label}`,
                ),
            ],
        });
    },
};
