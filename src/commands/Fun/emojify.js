import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const LETTER_EMOJI = Object.fromEntries(
    'abcdefghijklmnopqrstuvwxyz'
        .split('')
        .map((c) => [c, `:regional_indicator_${c}:`]),
);

function emojify(text) {
    return [...text.toLowerCase()]
        .map((c) => {
            if (LETTER_EMOJI[c]) return LETTER_EMOJI[c];
            if (c >= '0' && c <= '9') return ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][Number(c)];
            if (c === ' ') return '  ';
            if (c === '!') return '❗';
            if (c === '?') return '❓';
            return c;
        })
        .join(' ');
}

export default {
    data: new SlashCommandBuilder()
        .setName('emojify')
        .setDescription('Turn your text into regional indicator emojis.')
        .addStringOption((o) =>
            o.setName('text').setDescription('Text to emojify').setRequired(true).setMaxLength(100),
        ),
    category: 'Fun',

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const text = interaction.options.getString('text');
        const result = emojify(text);

        // Discord has a 4096 char embed description limit
        const capped = result.length > 3900 ? result.slice(0, 3897) + '…' : result;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed('🔤 Emojified!', capped)],
        });
    },
};
