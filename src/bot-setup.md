# Discord Bot Setup Guide

## Spotify-like Status Display

This bot displays a Spotify-like interface showing "Listening to No Other Heart by Mac DeMarco" with a play button.

### Setup Instructions

1. **Get Your Bot Token:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and click "Add Bot"
   - Copy the token

2. **Update config.json:**
   ```json
   {
     "token": "YOUR_BOT_TOKEN_HERE"
   }
   ```

3. **Install Dependencies:**
   ```bash
   npm install discord.js
   ```

4. **Run the Bot:**
   ```bash
   node src/bot.js
   ```

### Features

✓ Bot displays "Listening to No Other Heart by Mac DeMarco"
✓ Spotify-like rich presence interface with play button
✓ Automatic status on startup
✓ Shows artist name: Mac DeMarco
✓ Shows song title: No Other Heart

### Status Display

When your bot goes online, Discord users will see:
- A listening status icon
- Song title: "No Other Heart"
- Artist: "Mac DeMarco"
- A play button interface (like Spotify)

### Discord Intents Required

- Guilds (to listen to guild events)

Make sure these intents are enabled in your [Discord Developer Portal](https://discord.com/developers/applications).