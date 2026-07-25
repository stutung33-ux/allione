import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COMPLIMENTS = [
    'You make the world a little brighter just by being in it.',
    'You have the best laugh and I hope you use it often.',
    'You\'re more fun than bubble wrap.',
    'If kindness was currency, you\'d be a billionaire.',
    'You bring out the best in people around you.',
    'You\'re like a ray of sunshine on a cloudy day.',
    'Your positivity is genuinely contagious.',
    'You handle challenges with more grace than most.',
    'You\'re the kind of person songs get written about.',
    'Every room you enter becomes a better place.',
    'You make even the most ordinary moments feel special.',
    'You have an incredible heart — never stop being you.',
    'Your creativity knows no bounds.',
    'You\'re braver than you believe and stronger than you know.',
    'The world is better with you in it. Truly.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('compliment')
        .setDescription('Send someone a genuine compliment.')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to compliment (defaults to yourself)').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user') ?? interaction.user;
        const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    `💖 Compliment for ${target.username}`,
                    `Hey ${target}, ${compliment}`,
                ),
            ],
        });
    },
};
