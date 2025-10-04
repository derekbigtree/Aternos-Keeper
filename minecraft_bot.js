// ============================================
// MINECRAFT KEEPALIVE BOT - CRASH RESISTANT
// ============================================

const mineflayer = require('mineflayer');
const express = require('express');

const CONFIG = {
  SERVER_HOST: process.env.SERVER_HOST || 'YourServer.aternos.me',
  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 25565,
  BOT_USERNAME: process.env.BOT_USERNAME || 'KeepaliveBot',
  MC_VERSION: process.env.MC_VERSION || '1.21',
  WEB_PORT: process.env.PORT || 3000
};

// ============================================
// WEB SERVER
// ============================================
const app = express();
let bot = null;

app.get('/', (req, res) => {
  const status = bot ? 'Connected' : 'Disconnected';
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bot Status</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body { 
            font-family: Arial; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            text-align: center; 
            padding: 50px; 
          }
          .status { font-size: 48px; margin: 30px; color: ${bot ? '#4CAF50' : '#ff5555'}; }
        </style>
      </head>
      <body>
        <h1>Minecraft Keepalive Bot</h1>
        <div class="status">${status}</div>
        <p>Server: ${CONFIG.SERVER_HOST}</p>
        <p>Uptime: ${hours}h ${minutes}m</p>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    connected: bot ? true : false,
    server: CONFIG.SERVER_HOST,
    uptime: process.uptime()
  });
});

app.listen(CONFIG.WEB_PORT, '0.0.0.0', () => {
  console.log(`Web server running on port ${CONFIG.WEB_PORT}`);
});

// ============================================
// BOT WITH CRASH PROTECTION
// ============================================
let reconnectAttempts = 0;

function createBot() {
  console.log(`[${new Date().toLocaleTimeString()}] Creating bot...`);
  
  try {
    bot = mineflayer.createBot({
      host: CONFIG.SERVER_HOST,
      port: CONFIG.SERVER_PORT,
      username: CONFIG.BOT_USERNAME,
      version: CONFIG.MC_VERSION,
      auth: 'offline'
    });

    // Catch ALL errors at the client level
    if (bot._client) {
      bot._client.on('error', (err) => {
        console.log(`Client error caught: ${err.message}`);
        // Don't let it crash - just log it
      });
    }

    bot.on('spawn', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Bot spawned successfully`);
      reconnectAttempts = 0;
    });

    // Anti-AFK movements
    bot.on('physicsTick', () => {
      try {
        if (bot && bot.time && bot.time.age % 600 === 0) {
          bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
        }
      } catch (e) {
        // Ignore movement errors
      }
    });

    bot.on('kicked', (reason) => {
      console.log(`[${new Date().toLocaleTimeString()}] Kicked: ${reason}`);
      bot = null;
      reconnect();
    });

    bot.on('error', (err) => {
      console.log(`[${new Date().toLocaleTimeString()}] Bot error: ${err.message}`);
      // Don't set bot to null on chat errors
      if (!err.message.includes('chat') && !err.message.includes('version')) {
        bot = null;
        reconnect();
      }
    });

    bot.on('end', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Disconnected`);
      bot = null;
      reconnect();
    });

    bot.on('death', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Died, respawning...`);
      setTimeout(() => {
        if (bot) bot.respawn();
      }, 1000);
    });

  } catch (err) {
    console.log(`[${new Date().toLocaleTimeString()}] Failed to create bot: ${err.message}`);
    bot = null;
    reconnect();
  }
}

function reconnect() {
  reconnectAttempts++;
  const delay = Math.min(reconnectAttempts * 5000, 30000);
  console.log(`[${new Date().toLocaleTimeString()}] Reconnecting in ${delay/1000}s...`);
  setTimeout(createBot, delay);
}

// Global error handlers to prevent process crashes
process.on('uncaughtException', (err) => {
  console.log(`Uncaught exception: ${err.message}`);
  // Don't crash the process
});

process.on('unhandledRejection', (err) => {
  console.log(`Unhandled rejection: ${err.message}`);
  // Don't crash the process
});

// ============================================
// START
// ============================================
console.log('='.repeat(60));
console.log('MINECRAFT KEEPALIVE BOT');
console.log('='.repeat(60));
console.log(`Server: ${CONFIG.SERVER_HOST}:${CONFIG.SERVER_PORT}`);
console.log(`Username: ${CONFIG.BOT_USERNAME}`);
console.log(`Version: ${CONFIG.MC_VERSION}`);
console.log('='.repeat(60));

createBot();

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  if (bot) bot.quit();
  process.exit(0);
});