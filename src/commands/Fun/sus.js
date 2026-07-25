import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SUS_REASONS = [
    'has been seen venting a lot.',
    'was the last one near the body.',
    'always calls emergency meetings.',
    'never does tasks.',
    'follows people around the map.',
    'faked a task — we saw you.',
    'was in electrical alone for too long.',
    'skipped the last vote.',
    'voted too fast without reading chat.',
    'is literally always quiet.',
];

function progressBar(pct) {
    const filled = Math.round(pct / 10);
    return '🔴'.repeat(filled) + '⬜'.repeat(10 - filled);
}

export default {
    data: new SlashCommandBuilder()
        .setName('sus')
        .setDescription('Find out how sus someone is. 📮')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to check (defaults to you)').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user') ?? interaction.user;
        const pct = Math.floor(Math.random() * 101);
        const reason = SUS_REASONS[Math.floor(Math.random() * SUS_REASONS.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                warningEmbed(
                    `📮 Sus Meter — ${target.username}`,
                    `${progressBar(pct)}\n\n**${pct}% sus** — ${target.username} ${reason}`,
                ),
            ],
        });
    },
};
