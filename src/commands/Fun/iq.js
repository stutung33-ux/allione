import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('iq')
        .setDescription('Measure someone\'s (fake) IQ.')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to check (defaults to you)').setRequired(false),
        ),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 30_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const target = interaction.options.getUser('user') ?? interaction.user;
        const iq = Math.floor(Math.random() * 180) + 20;
        const label =
            iq < 70  ? 'Galaxy-brained in reverse.' :
            iq < 90  ? 'Below average. Sorry.' :
            iq < 110 ? 'Totally average.' :
            iq < 130 ? 'Pretty smart!' :
            iq < 150 ? 'Genius level!' :
            'Off the charts! Einstein-tier. 🧠';

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    `🧠 IQ Test — ${target.username}`,
                    `**IQ Score: ${iq}**\n${label}`,
                ),
            ],
        });
    },
};
