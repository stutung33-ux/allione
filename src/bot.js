const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const config = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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

client.login(config.token);