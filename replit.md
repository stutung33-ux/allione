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

## Making the Bot Public (Add to Any Server)

Slash commands are registered **globally** (no GUILD_ID restriction in the command loader), so the bot can be added to any server.

To enable public invites you must tick **"Public Bot"** in the Discord Developer Portal:
1. Go to https://discord.com/developers/applications → your app
2. Click **Bot** in the left sidebar
3. Enable **Public Bot** and save
4. Share your OAuth2 invite link (select `bot` + `applications.commands` scopes and the required permissions)

## Recent Feature Changes

| Feature | File(s) |
|---|---|
| **Broadcast fix** | `src/commands/Moderation/broadcast.js` — newlines preserved, 500 ms delay between sends prevents rate-limit errors |
| **`/giverole`** | `src/commands/Moderation/giverole.js` — add/remove a role for a specific member with permission + hierarchy checks |
| **`/antiraid`** | `src/commands/Moderation/antiraid.js` — configure anti-raid (setup / disable / status / clear) |
| **Anti-raid engine** | `src/services/antiraidService.js` — sliding-window join tracking, auto-kick/ban, alert channel support |
| **Auto-detection** | `src/events/guildMemberAdd.js` — anti-raid check fires on every join |

### Anti-Raid Quick Start
```
/antiraid setup threshold:10 window:10 action:kick min_account_age:7 alert_channel:#mod-alerts
```
- Detects 10 joins within 10 s → raid mode activates for 120 s
- Kicks any new joiner with an account < 7 days old
- Posts alerts to `#mod-alerts`

## Deployment

The live bot is deployed on Railway. Push changes here, then redeploy on Railway. Auto-migration runs on startup (`AUTO_MIGRATE=true`).

## User Preferences

- Keep changes minimal and focused — don't restructure or migrate existing patterns.
- New commands go into the appropriate `src/commands/<Category>/` folder following the existing file style.
- The bot is already live; Railway is the deployment target.
