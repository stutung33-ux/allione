import {
    SlashCommandBuilder,
    ActionRowBuilder,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import { createSelectMenu } from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

// Simple cache to avoid rebuilding on every /help invocation
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function formatCategoryName(raw) {
    return raw
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function extractCommandNames(data) {
    if (!data?.name) return [];
    const opts = Array.isArray(data.options) ? data.options : [];
    const names = [];
    for (const opt of opts) {
        if (!opt) continue;
        if (opt.type === SUBCOMMAND_TYPE) {
            names.push(`${data.name} ${opt.name}`);
        } else if (opt.type === SUBCOMMAND_GROUP_TYPE) {
            for (const nested of (opt.options || [])) {
                if (nested?.type === SUBCOMMAND_TYPE) {
                    names.push(`${data.name} ${opt.name} ${nested.name}`);
                }
            }
        }
    }
    if (names.length === 0) names.push(data.name);
    return names;
}

export async function createInitialHelpMenu(client) {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();

    const categories = [];
    let totalCommands = 0;

    for (const dir of categoryDirs) {
        const displayName = formatCategoryName(dir);
        const names = [];
        try {
            const catPath = path.join(commandsPath, dir);
            const files = (await fs.readdir(catPath)).filter(f => f.endsWith('.js')).sort();
            for (const file of files) {
                const mod = await import(`file://${path.join(catPath, file)}`);
                const cmd = mod.default;
                if (!cmd?.data) continue;
                const raw = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data;
                if (!raw?.name || raw.name === 'help' || raw.name === 'commandlist') continue;
                names.push(...extractCommandNames(raw));
            }
        } catch {}
        if (names.length === 0) continue;
        names.sort((a, b) => a.localeCompare(b));
        totalCommands += names.length;
        categories.push({ dir, displayName, names });
    }

    const fields = [];
    for (let i = 0; i < categories.length; i++) {
        const { displayName, names } = categories[i];
        const tags = names.map(n => `\`${n}\``);
        // Split into chunks that fit within Discord's 1024-char field limit
        const chunks = [];
        let cur = '';
        for (const tag of tags) {
            const next = cur ? `${cur} ${tag}` : tag;
            if (next.length > 1024) {
                if (cur) chunks.push(cur);
                cur = tag;
            } else {
                cur = next;
            }
        }
        if (cur) chunks.push(cur);

        chunks.forEach((chunk, ci) => {
            fields.push({
                name: ci === 0 ? `${i + 1}. ${displayName}` : '\u200b',
                value: chunk,
                inline: false,
            });
        });
    }

    const embed = createEmbed({ title: 'All Commands', fields });
    embed.setFooter({ text: `${totalCommands} Commands • ${categories.length} Categories` });

    const selectOptions = [
        { label: 'All Commands', value: ALL_COMMANDS_ID },
        ...categories.map(c => ({ label: c.displayName, value: c.dir })),
    ];

    const selectRow = createSelectMenu(CATEGORY_SELECT_ID, 'Choose a category...', selectOptions);

    const result = { embeds: [embed], components: [selectRow] };
    _cache = result;
    _cacheTime = now;
    return result;
}

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays the help menu with all available commands"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);
        const { embeds, components } = await createInitialHelpMenu(client);
        await InteractionHelper.safeEditReply(interaction, { embeds, components });

        setTimeout(async () => {
            try {
                if (!InteractionHelper.isInteractionValid(interaction)) return;
                const closedEmbed = createEmbed({
                    title: "Help menu closed",
                    description: "Help menu has been closed, use /help again.",
                    color: "secondary",
                });
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch {}
        }, HELP_MENU_TIMEOUT_MS);
    },
};
