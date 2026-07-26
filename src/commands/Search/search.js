import { SlashCommandBuilder } from 'discord.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import searchDefine from './modules/search_define.js';
import searchGoogle from './modules/search_google.js';
import searchUrban from './modules/search_urban.js';
import searchWikipedia from './modules/search_wikipedia.js';
import searchYouTube from './modules/search_youtube.js';
import searchGitHub from './modules/search_github.js';
import searchNpm from './modules/search_npm.js';
import searchDjs from './modules/search_djs.js';

/** Shared string option for commands that take a 'query' string. */
function queryOption(description) {
    return option => option.setName('query').setDescription(description).setRequired(true);
}

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search the web, dictionaries, and developer resources')
        .addSubcommand(sub =>
            sub.setName('define')
                .setDescription('Look up a word definition')
                .addStringOption(opt =>
                    opt.setName('word').setDescription('The word to look up').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('google')
                .setDescription('Search Google')
                .addStringOption(queryOption('What would you like to search for?'))
        )
        .addSubcommand(sub =>
            sub.setName('urban')
                .setDescription('Search Urban Dictionary for definitions')
                .addStringOption(opt =>
                    opt.setName('term').setDescription('The term to look up on Urban Dictionary').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('wikipedia')
                .setDescription('Search Wikipedia')
                .addStringOption(queryOption('Topic to look up on Wikipedia'))
        )
        .addSubcommand(sub =>
            sub.setName('youtube')
                .setDescription('Search YouTube')
                .addStringOption(queryOption('What to search for on YouTube'))
        )
        .addSubcommand(sub =>
            sub.setName('github')
                .setDescription('Search GitHub repositories')
                .addStringOption(queryOption('Repository name or keyword'))
        )
        .addSubcommand(sub =>
            sub.setName('npm')
                .setDescription('Search npm packages')
                .addStringOption(queryOption('Package name or keyword'))
        )
        .addSubcommand(sub =>
            sub.setName('djs')
                .setDescription('Search the Discord.js documentation')
                .addStringOption(queryOption('Class, method, or topic to look up'))
        ),

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'define':
                return searchDefine.execute(interaction, config, client);
            case 'google':
                return searchGoogle.execute(interaction, config, client);
            case 'urban':
                return searchUrban.execute(interaction, config, client);
            case 'wikipedia':
                return searchWikipedia.execute(interaction, config, client);
            case 'youtube':
                return searchYouTube.execute(interaction, config, client);
            case 'github':
                return searchGitHub.execute(interaction, config, client);
            case 'npm':
                return searchNpm.execute(interaction, config, client);
            case 'djs':
                return searchDjs.execute(interaction, config, client);
            default:
                return replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Unknown subcommand' });
        }
    }
};
