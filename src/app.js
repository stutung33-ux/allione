import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, ActivityType } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { getGuildConfig } from './services/config/guildConfig.js';
import { getServerCounters, saveServerCounters, updateCounter } from './services/serverstatsService.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/loaders/commandLoader.js';
import { runSafeTask, handleTaskError, ErrorCodes } from './utils/errorHandler.js';
import { initializeMusic } from './services/music/riffySetup.js';
import { shutdownMusic } from './services/music/playerHandler.js';
import pkg from '../package.json' with { type: 'json' };
import { EXPECTED_SCHEMA_VERSION, EXPECTED_SCHEMA_LABEL } from './config/database/schemaVersion.js';

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        
        GatewayIntentBits.Guilds,                        
        GatewayIntentBits.GuildMembers,                 

        GatewayIntentBits.GuildMessages,                
        GatewayIntentBits.GuildMessageReactions,        
        GatewayIntentBits.MessageContent,               
        GatewayIntentBits.DirectMessages,

        GatewayIntentBits.GuildVoiceStates,             

        GatewayIntentBits.GuildBans,                    
      ],
    });

    this.config = config;
    this.commands = new Collection();
    this.events = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.cooldowns = new Collection();
    this.db = null;
    this.rest = new REST({ version: '10' }).setToken(config.bot.token);
  }

  async start() {
    try {
      startupLog('Starting TitanBot...');

      // Start web server FIRST - Railway health check connects immediately
      startupLog('Starting web server...');
      this.startWebServer();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize database in background (don't block startup)
      startupLog('Initializing database...');
      try {
        const dbInstance = await initializeDatabase();
        this.db = dbInstance.db;
        const dbStatus = this.db.getStatus();
        if (!dbStatus.isDegraded) {
          startupLog(`✅ Database connected: ${dbStatus.connectionType}`);
        } else {
          logger.warn('⚠️  Database in degraded mode, continuing...');
        }
      } catch (dbError) {
        logger.warn('⚠️  Database init failed, continuing without DB:', dbError.message);
        this.db = null;
      }
      
      startupLog('Loading commands...');
      await loadCommands(this);
      startupLog(`Commands loaded: ${this.commands.size}`);
      
      startupLog('Loading handlers...');
      await this.loadHandlers();
      startupLog('Handlers loaded');

      try {
        initializeMusic(this);
      } catch (e) {
        logger.warn('Music init failed:', e.message);
      }
      
      startupLog('Logging into Discord...');
      await this.login(this.config.bot.token);
      startupLog('Discord login successful');
      
      startupLog('Registering slash commands...');
      await this.registerCommands();
      startupLog('Slash commands registered');
      
      startupLog(`ONLINE ✅ | ${this.commands.size} commands | Database: ${this.db ? 'Connected' : 'Degraded'}`);
      this.setupCronJobs();
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  setupSpotifyStatus() {
    try {
      this.user.setActivity('No Other Heart by Mac DeMarco', {
        type: ActivityType.Listening,
      });
      startupLog('✅ Spotify status: Listening to No Other Heart by Mac DeMarco');
    } catch (e) {
      logger.warn('Failed to set Spotify status:', e.message);
    }
  }

  startWebServer() {
    const app = express();
    const port = parseInt(process.env.PORT) || 3000;
    const host = '0.0.0.0';
    
    // Health check - always returns 200 OK
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', uptime: process.uptime() });
    });

    app.get('/ready', (req, res) => {
      if (this.isReady()) {
        res.status(200).json({ ready: true });
      } else {
        res.status(503).json({ ready: false });
      }
    });

    app.get('/', (req, res) => {
      res.json({ message: 'TitanBot Online', version: pkg.version });
    });

    const server = app.listen(port, host, () => {
      this.webServer = server;
      startupLog(`✅ Web server on ${host}:${port}`);
    }).on('error', (err) => {
      logger.error('Web server error:', err.message);
      process.exit(1);
    });
  }

  setupCronJobs() {
    try {
      cron.schedule('0 6 * * *', runSafeTask('birthday_check', () => checkBirthdays(this)));
      cron.schedule('* * * * *', runSafeTask('giveaway_check', () => checkGiveaways(this)));
      cron.schedule('*/15 * * * *', runSafeTask('counter_update', () => this.updateAllCounters()));
    } catch (e) {
      logger.warn('Cron setup failed:', e.message);
    }
  }

  async updateAllCounters() {
    if (!this.db) return;
    for (const [guildId, guild] of this.guilds.cache) {
      try {
        const counters = await getServerCounters(this, guildId);
        const validCounters = [];
        for (const counter of counters) {
          if (counter?.type && counter?.channelId) {
            const channel = guild.channels.cache.get(counter.channelId);
            if (channel) {
              validCounters.push(counter);
              await updateCounter(this, guild, counter);
            }
          }
        }
      } catch (e) {
        logger.error(`Counter update failed for ${guildId}:`, e.message);
      }
    }
  }

  async loadHandlers() {
    for (const handler of ['events', 'interactions']) {
      try {
        const module = await import(`./handlers/loaders/${handler}.js`);
        const loaderFn = module.default || Object.values(module)[0];
        if (typeof loaderFn === 'function') {
          await loaderFn(this);
        }
      } catch (error) {
        logger.error(`Failed to load ${handler}:`, error.message);
        throw error;
      }
    }
  }

  async registerCommands() {
    try {
      await registerSlashCommands(this, { clientId: this.config.bot.clientId });
    } catch (error) {
      logger.error('Command registration error:', error.message);
    }
  }

  async shutdown(reason = 'UNKNOWN') {
    try {
      if (this.webServer) {
        await new Promise((resolve) => this.webServer.close(resolve));
      }
      if (this.db?.db?.pool) {
        await this.db.db.pool.end();
      }
      if (this.isReady()) this.destroy();
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error);
      process.exit(1);
    }
  }
}

try {
  const bot = new TitanBot();
  
  process.on('SIGTERM', () => bot.shutdown('SIGTERM'));
  process.on('SIGINT', () => bot.shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    bot.shutdown('UNCAUGHT_EXCEPTION');
  });

  bot.start().catch((error) => {
    logger.error('Startup error:', error);
    bot.shutdown('STARTUP_ERROR');
  });
  
  bot.once('ready', () => {
    bot.setupSpotifyStatus();
  });
} catch (error) {
  logger.error('Fatal error:', error);
  process.exit(1);
}

export default TitanBot;
