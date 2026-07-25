import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HACK_STEPS = [
    '🔍 Scanning target IP address...',
    '🔓 Bypassing firewall...',
    '💉 Injecting SQL payload...',
    '🧬 Cloning user credentials...',
    '📡 Intercepting encrypted packets...',
    '🖥️ Accessing mainframe...',
    '🔑 Cracking 2048-bit RSA key...',
    '📂 Downloading private files...',
    '🧹 Wiping log traces...',
    '✅ Hack complete.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Initiate a (fake) hacking sequence on a user.')
        .addUserOption((o) =>
            o.setName('target').setDescription('The user to "hack"').setRequired(true),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 3, windowMs: 60_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('target');

        for (let i = 0; i < HACK_STEPS.length; i++) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    infoEmbed(
                        `💻 Hacking ${target.username}…`,
                        HACK_STEPS.slice(0, i + 1).join('\n'),
                    ),
                ],
            });
            await sleep(700);
        }

        const ip = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
        const password = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    `💻 ${target.username} has been hacked! 😈`,
                    [
                        `**IP Address:** \`${ip}\``,
                        `**Password:** \`${password}\``,
                        `**Location:** \`Unknown — classified\``,
                        '',
                        "*This is 100% fake. Please don't actually hack people.*",
                    ].join('\n'),
                ),
            ],
        });
    },
};
