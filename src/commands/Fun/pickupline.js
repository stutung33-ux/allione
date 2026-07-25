import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const LINES = [
    'Are you a parking ticket? Because you\'ve got "fine" written all over you.',
    'Do you have a map? I keep getting lost in your eyes.',
    'Are you a magician? Because whenever I look at you, everyone else disappears.',
    'Is your name Google? Because you have everything I\'ve been searching for.',
    'Are you a camera? Every time I look at you, I smile.',
    'Do you believe in love at first sight, or should I walk by again?',
    'Are you a bank loan? Because you have my interest.',
    'If you were a vegetable, you\'d be a cute-cumber.',
    'Are you French? Because Eiffel for you.',
    'I must be a snowflake, because I\'ve fallen for you.',
    'Do you have a Band-Aid? Because I just scraped my knee falling for you.',
    'Are you a star? Because your beauty lights up the room.',
    'Is your name Wi-Fi? Because I\'m feeling a connection.',
    'Are you a time traveler? Because I can see you in my future.',
    'Do you have a sunburn, or are you always this hot?',
    'Are you a dictionary? Because you add meaning to my life.',
    'I\'m not a photographer, but I can picture us together.',
    'Are you a beaver? Because dam.',
    'Is your dad a boxer? Because you\'re a knockout!',
    'Are you a keyboard? Because you\'re just my type.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('pickupline')
        .setDescription('Get a random pick-up line.'),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const line = LINES[Math.floor(Math.random() * LINES.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed('💘 Pick-Up Line', `*"${line}"*`)],
        });
    },
};
