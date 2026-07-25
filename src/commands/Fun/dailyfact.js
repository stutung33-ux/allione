import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const FACTS = [
    'Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.',
    'A group of flamingos is called a "flamboyance."',
    'Octopuses have three hearts, blue blood, and can taste with their suckers.',
    'The Eiffel Tower grows about 6 inches taller in summer due to thermal expansion.',
    'Bananas are technically berries, but strawberries are not.',
    'Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.',
    'A day on Venus is longer than a year on Venus.',
    'Sharks are older than trees. Sharks have existed for ~450 million years; trees only ~350 million.',
    'The longest recorded flight of a chicken is 13 seconds.',
    'Humans share 60% of their DNA with bananas.',
    'There are more stars in the universe than grains of sand on all of Earth\'s beaches.',
    'The word "nerd" was first used by Dr. Seuss in "If I Ran the Zoo" (1950).',
    'A snail can sleep for up to 3 years.',
    'Hot water freezes faster than cold water under certain conditions. This is called the Mpemba effect.',
    'The original name for the search engine Google was "Backrub."',
    'Crows can recognize human faces and hold grudges.',
    'The inventor of the Pringles can was buried in one.',
    'A bolt of lightning is five times hotter than the surface of the sun.',
    'The heart of a shrimp is located in its head.',
    'Wombat poop is cube-shaped.',
];

export default {
    data: new SlashCommandBuilder()
        .setName('dailyfact')
        .setDescription('Get a random interesting fact.'),
    category: 'Fun',
    abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

    async execute(interaction) {
        await InteractionHelper.safeDefer(interaction);
        const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
        const index = FACTS.indexOf(fact) + 1;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                infoEmbed(
                    `💡 Fun Fact #${index}`,
                    fact,
                ),
            ],
        });
    },
};
