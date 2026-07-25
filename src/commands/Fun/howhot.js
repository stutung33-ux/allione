import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function hotBar(pct) {
    const filled = Math.round(pct / 10);
    return '🔥'.repeat(filled) + '🧊'.repeat(10 - filled);
}

export default {
    data: new SlashCommandBuilder()
        .setName('howhot')
        .setDescription('Find out how hot someone is (just for fun!).')
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
            pct < 20 ? 'Ice cold. 🧊' :
            pct < 50 ? 'Lukewarm.' :
            pct < 75 ? 'Decent heat!' :
            pct < 90 ? 'Pretty hot!' :
            'ABSOLUTELY FIRE. 🔥';

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    `🔥 Hot Meter — ${target.username}`,
                    `${hotBar(pct)}\n\n**${pct}% hot** — ${label}`,
                ),
            ],
        });
    },
};
