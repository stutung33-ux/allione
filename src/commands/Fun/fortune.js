import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const FORTUNES = [
    'A beautiful surprise is waiting for you soon. 🌟',
    'Your hard work will pay off this week.',
    'Someone is thinking about you right now. 💭',
    'The answer you seek is already within you.',
    'An unexpected opportunity will change everything.',
    'Be careful who you trust today.',
    'Fortune favors the bold. Take that leap.',
    'Something you lost will return to you.',
    'The stars are aligned in your favor tonight.',
    'Avoid spicy food on Tuesdays. Trust us.',
    'A cat will cross your path and bring luck.',
    'Your next big idea will come from a dream.',
    'Do not ignore the small details today.',
    'A long overdue conversation will bring peace.',
    'Good things come to those who grind.',
    'You will find $5 in an old jacket. Maybe.',
    'The person who annoys you most holds a lesson.',
    'New friendships are forming around you.',
    'Your memes will be dank this week.',
    'Rest more. Hustle less. Balance is key.',
];

const LUCKY_NUMBERS = () =>
    Array.from({ length: 6 }, () => Math.floor(Math.random() * 50) + 1)
        .sort((a, b) => a - b)
        .join(', ');

export default {
    data: new SlashCommandBuilder()
        .setName('fortune')
        .setDescription('Receive your fortune cookie wisdom for the day.'),
    category: 'Fun',
    abuseProtection: { maxAttempts: 3, windowMs: 60_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
        const color = ['pink', 'yellow', 'white'][Math.floor(Math.random() * 3)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    '🥠 Fortune Cookie',
                    [
                        `*"${fortune}"*`,
                        '',
                        `**Lucky Numbers:** ${LUCKY_NUMBERS()}`,
                        `**Lucky Color:** ${color}`,
                    ].join('\n'),
                ),
            ],
        });
    },
};
