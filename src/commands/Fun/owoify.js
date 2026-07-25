import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function owoify(text) {
    return text
        .replace(/r/g, 'w').replace(/R/g, 'W')
        .replace(/l/g, 'w').replace(/L/g, 'W')
        .replace(/n([aeiou])/g, 'ny$1').replace(/N([aeiou])/g, 'Ny$1')
        .replace(/ove/g, 'uv')
        .replace(/!+/g, ' uwu!')
        .replace(/\?+/g, ' owo?')
        .replace(/th/g, 'd').replace(/Th/g, 'D');
}

const SUFFIXES = [' uwu', ' owo', ' >w<', ' ^w^', ' UwU', ' :3'];

export default {
    data: new SlashCommandBuilder()
        .setName('owoify')
        .setDescription('owoify youw text uwu.')
        .addStringOption((o) =>
            o.setName('text').setDescription('Text to owoify').setRequired(true).setMaxLength(500),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const text = interaction.options.getString('text');
        const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
        const owoified = owoify(text) + suffix;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed('OwO What\'s this?', owoified)],
        });
    },
};
