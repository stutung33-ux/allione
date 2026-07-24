# TitanBot

A feature-rich Discord bot built with Discord.js v14 and PostgreSQL. The live bot runs on Railway — this Replit repo is used for development and code changes.

## Stack

- **Runtime:** Node.js ≥ 20.10 (ESM modules)
- **Framework:** Discord.js v14
- **Database:** PostgreSQL (via `pg`) with an in-memory fallback
- **Other:** Express (web/health), node-cron (tasks), Winston (logging), Riffy/Lavalink (music)

## Project Structure

```
src/
  app.js              — Entry point
  commands/           — Slash commands, grouped by category
    Economy/          — balance, gamble, shop, daily, rob, etc.
    Fun/              — flip, roll, fight, count, hunt, zoo, sell-animal
    Moderation/       — ban, kick, warn, notes, etc.
    ...
  services/           — Business logic (economy, hunt, leveling, etc.)
  utils/              — Shared helpers (embeds, DB wrappers, logger, etc.)
  data/               — Static data files (animals.js, etc.)
  config/             — Bot config (bot.js) and DB config
  events/             — Discord.js event handlers
  handlers/           — Command/interaction loaders
```

## Hunt / Zoo Game

Ported and adapted from the OwO Bot's iconic animal hunting mechanic.

| Command | Description |
|---|---|
| `/hunt` | Hunt for animals (15 s cooldown) |
| `/zoo [user]` | View your (or another user's) zoo collection |
| `/sell-animal <animal> [amount]` | Sell animals for coins |

**Rarity tiers** (drop rate): Common 58% → Uncommon 28% → Rare 10% → Epic 2.5% → Mythic 0.95% → Legendary 0.04% → Phantom 0.01%

Data lives in `src/data/animals.js`. Hunt logic lives in `src/services/huntService.js`. Animal zoo data is stored under `guild:{guildId}:hunt:{userId}` in the KV store.

## Running Locally / on Replit

```bash
npm install
cp .env.example .env   # fill in DISCORD_TOKEN, CLIENT_ID, POSTGRES_URL
npm start
```

Required env vars: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`. PostgreSQL is strongly recommended; the bot falls back to in-memory storage automatically if unavailable.

## Deployment

The live bot is deployed on Railway. Push changes here, then redeploy on Railway. Auto-migration runs on startup (`AUTO_MIGRATE=true`).

## User Preferences

- Keep changes minimal and focused — don't restructure or migrate existing patterns.
- New commands go into the appropriate `src/commands/<Category>/` folder following the existing file style.
- The bot is already live; Railway is the deployment target.
