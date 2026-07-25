import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const CRIMES = [
    'excessive meme consumption',
    'being too powerful',
    'having a suspiciously clean search history',
    'owning more than 4 hoodies',
    'talking to themselves in the mirror',
    'liking pineapple on pizza',
    'overuse of the 💀 emoji',
    'sending "k" as a reply',
    'being awake at 3 AM on a Tuesday',
    'being too sigma',
];

export default {
    data: new SlashCommandBuilder()
        .setName('fbi')
        .setDescription('The FBI is watching. Check who the FBI is investigating.')
        .addUserOption((o) =>
            o.setName('suspect').setDescription('The suspect to investigate').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const suspect = interaction.options.getUser('suspect') ?? interaction.user;
        const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        const caseNumber = Math.floor(Math.random() * 900000) + 100000;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                warningEmbed(
                    '🔫 FBI OPEN UP!',
                    [
                        `**Case #${caseNumber}**`,
                        `**Suspect:** ${suspect}`,
                        `**Crime:** ${crime}`,
                        `**Threat Level:** ${'🔴'.repeat(Math.ceil(Math.random() * 5))}`,
                        '',
                        '*The FBI is always watching. Always.* 👁️',
                    ].join('\n'),
                ),
            ],
        });
    },
};
