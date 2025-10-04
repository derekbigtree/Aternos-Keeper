const mineflayer = require('mineflayer');
const express = require('express');

const CONFIG = {
  SERVER_HOST: process.env.SERVER_HOST || 'ThatLifeStealSMP.aternos.me',
  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 11827,
  BOT_USERNAME: process.env.BOT_USERNAME || 'BOT',
  MC_VERSION: process.env.MC_VERSION || '1.21',
  WEB_PORT: process.env.PORT || 3000
};

// Patch mineflayer to disable chat plugin
const originalCreateBot = mineflayer.createBot;
mineflayer.createBot = function(options) {
  const bot = originalCreateBot(options);
  
  // Remove chat plugin completely
  if (bot.chat) {
    bot.chat = () => {};
  }
  
  // Suppress all chat-related errors
  bot._client.on('error', (err) => {
    if (err.message && err.message.includes('chat')) {
      console.log('Suppressed chat error');
      return;
    }
    bot.emit('error', err);
  });
  
  return bot;
};

// Web server code (same as before)
const app = express();
let bot = null;

app.get('/', (req, res) => {
  const status = bot ? 'Connected ✓' : 'Disconnected ✗';
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
          body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 50px; }
          .status { font-size: 48px; margin: 30px; }
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

app.listen(CONFIG.WEB_PORT, () => {
  console.log(`Web server on port ${CONFIG.WEB_PORT}`);
});

// Bot creation
let reconnectAttempts = 0;

function createBot() {
  console.log('Creating bot...');
  
  bot = mineflayer.createBot({
    host: CONFIG.SERVER_HOST,
    port: CONFIG.SERVER_PORT,
    username: CONFIG.BOT_USERNAME,
    version: CONFIG.MC_VERSION,
    auth: 'offline'
  });

  bot.on('spawn', () => {
    console.log('Bot spawned successfully');
    reconnectAttempts = 0;
  });

  bot.on('physicsTick', () => {
    if (bot.time.age % 600 === 0) {
      bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
    }
  });

  bot.on('kicked', (reason) => {
    console.log(`Kicked: ${reason}`);
    bot = null;
    reconnect();
  });

  bot.on('error', (err) => {
    if (err.message && err.message.includes('chat')) {
      console.log('Chat error suppressed, bot staying connected');
      return;
    }
    console.log(`Error: ${err.message}`);
    bot = null;
    reconnect();
  });

  bot.on('end', () => {
    console.log('Disconnected');
    bot = null;
    reconnect();
  });
}

function reconnect() {
  reconnectAttempts++;
  setTimeout(createBot, 10000);
}

createBot();