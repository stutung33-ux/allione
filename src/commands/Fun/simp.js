import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function simpMeter(pct) {
    const filled = Math.round(pct / 10);
    return '🟥'.repeat(filled) + '⬜'.repeat(10 - filled);
}

export default {
    data: new SlashCommandBuilder()
        .setName('simp')
        .setDescription('Check how much of a simp someone is.')
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
            pct < 20 ? 'Not a simp at all.' :
            pct < 50 ? 'A little simpy…' :
            pct < 75 ? 'Certified simp.' :
            pct < 90 ? 'MEGA SIMP.' :
            'S.I.M.P — Someone Idolizing Mediocre People. 💀';

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    `💘 Simp Meter — ${target.username}`,
                    `${simpMeter(pct)}\n\n**${pct}% simp** — ${label}`,
                ),
            ],
        });
    },
};
