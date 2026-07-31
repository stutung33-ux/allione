import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', bot: client.isReady() });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✓ Health check server running on port ${PORT}`);
});

client.once('ready', () => {
  console.log(`✓ Bot logged in as ${client.user.tag}`);
  
  // Set bot status to Listening with Spotify-like interface
  client.user.setActivity('No Other Heart by Mac DeMarco', {
    type: ActivityType.Listening,
    name: 'No Other Heart',
    details: 'Mac DeMarco',
    state: 'Playing',
  });
  
  console.log('✓ Status set: Listening to No Other Heart by Mac DeMarco');
  console.log('✓ Bot is now displaying Spotify-like interface with play button');
});

client.login(process.env.DISCORD_TOKEN);
