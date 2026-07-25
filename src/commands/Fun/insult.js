import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const INSULTS = [
    'You\'re the human equivalent of a participation trophy.',
    'If laughter is the best medicine, your face could cure the world.',
    'You\'re not stupid; you just have bad luck thinking.',
    'I\'d agree with you but then we\'d both be wrong.',
    'You\'re like a cloud. When you disappear, it\'s a beautiful day.',
    'I\'ve met some pricks in my time, but you\'re a cactus.',
    'You have the right to remain silent. Please use it.',
    'I\'d roast you, but my mum said I\'m not allowed to burn trash.',
    'Light travels faster than sound. That\'s why you seemed bright before you spoke.',
    'You\'re proof that even evolution makes mistakes.',
    'I\'d explain it to you, but I left my crayons at home.',
    'You\'re not the dumbest person alive, but you\'d better hope they don\'t die.',
    'If you were any more inbred you\'d be a sandwich.',
    'You\'re like a software update — whenever I see you, I think "not now."',
    'Some cause happiness wherever they go. You cause it whenever you go.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('insult')
        .setDescription('Get a silly (harmless) roast for someone.')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to insult (defaults to yourself)').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user') ?? interaction.user;
        const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                warningEmbed(
                    `🔥 Roasted: ${target.username}`,
                    `${target}, ${insult}`,
                ),
            ],
        });
    },
};
