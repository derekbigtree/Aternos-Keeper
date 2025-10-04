// ============================================
// MINECRAFT KEEPALIVE BOT - RAILWAY READY
// ============================================

const mineflayer = require('mineflayer');
const express = require('express');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SERVER_HOST: process.env.SERVER_HOST || 'ThatLifeStealSMP.aternos.me',
  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 11827,
  BOT_USERNAME: process.env.BOT_USERNAME || 'BOT',
  MC_VERSION: process.env.MC_VERSION || '1.21',
  WEB_PORT: process.env.PORT || 3000
};

// ============================================
// WEB SERVER (Status Page)
// ============================================
const app = express();

app.get('/', (req, res) => {
  const status = bot ? 'Connected ✓' : 'Disconnected ✗';
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const players = bot ? Object.keys(bot.players).length : 0;
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Minecraft Bot Status</title>
        <meta http-equiv="refresh" content="10">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 50px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 { 
            font-size: 48px; 
            margin-bottom: 30px;
            text-align: center;
          }
          .status { 
            font-size: 36px; 
            margin: 30px 0;
            text-align: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: ${bot ? '#4CAF50' : '#f44336'};
            font-weight: bold;
          }
          .info { 
            font-size: 18px; 
            margin: 15px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
          }
          .label { opacity: 0.8; }
          .value { font-weight: bold; }
          .footer {
            margin-top: 30px;
            text-align: center;
            opacity: 0.6;
            font-size: 14px;
          }
          .pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎮 Minecraft Bot</h1>
          <div class="status ${bot ? 'pulse' : ''}">${status}</div>
          <div class="info">
            <span class="label">Server:</span>
            <span class="value">${CONFIG.SERVER_HOST}</span>
          </div>
          <div class="info">
            <span class="label">Username:</span>
            <span class="value">${CONFIG.BOT_USERNAME}</span>
          </div>
          <div class="info">
            <span class="label">Uptime:</span>
            <span class="value">${hours}h ${minutes}m</span>
          </div>
          <div class="info">
            <span class="label">Version:</span>
            <span class="value">${CONFIG.MC_VERSION}</span>
          </div>
          <div class="info">
            <span class="label">Players:</span>
            <span class="value">${players}</span>
          </div>
          <div class="footer">Auto-refreshes every 10 seconds | Running on Railway</div>
        </div>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    connected: bot ? true : false,
    server: CONFIG.SERVER_HOST,
    username: CONFIG.BOT_USERNAME,
    uptime: process.uptime(),
    players: bot ? Object.keys(bot.players).length : 0,
    timestamp: new Date().toISOString()
  });
});

app.listen(CONFIG.WEB_PORT, '0.0.0.0', () => {
  console.log(`✓ Web server running on port ${CONFIG.WEB_PORT}`);
});

// ============================================
// MINECRAFT BOT
// ============================================
let bot = null;
let reconnectAttempts = 0;

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function createBot() {
  log('Creating bot...');
  
  bot = mineflayer.createBot({
    host: CONFIG.SERVER_HOST,
    port: CONFIG.SERVER_PORT,
    username: CONFIG.BOT_USERNAME,
    version: CONFIG.MC_VERSION,
    auth: 'offline'
  });

  bot.on('spawn', () => {
    log('✓ Bot connected and spawned!');
    reconnectAttempts = 0;
    setTimeout(() => {
      if (bot) bot.chat('Keepalive bot active! Type !help');
    }, 2000);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    log(`<${username}> ${message}`);
    
    const msg = message.toLowerCase();
    
    if (msg === '!help') {
      bot.chat('Commands: !status !ping !uptime !players');
    }
    if (msg === '!status') {
      const up = Math.floor(process.uptime() / 60);
      bot.chat(`Online for ${up} minutes. Players: ${Object.keys(bot.players).length}`);
    }
    if (msg === '!ping') {
      bot.chat('Pong! Bot is alive.');
    }
    if (msg === '!uptime') {
      const up = Math.floor(process.uptime());
      const h = Math.floor(up / 3600);
      const m = Math.floor((up % 3600) / 60);
      bot.chat(`Uptime: ${h}h ${m}m`);
    }
    if (msg === '!players') {
      const players = Object.keys(bot.players).filter(p => p !== bot.username);
      bot.chat(players.length ? `Players: ${players.join(', ')}` : 'No players online');
    }
  });

  bot.on('whisper', (username, message) => {
    log(`[PM] ${username}: ${message}`);
  });

  // Anti-AFK: Random look around
  bot.on('physicsTick', () => {
    if (bot.time.age % 600 === 0) {
      bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
    }
  });

  bot.on('kicked', (reason) => {
    log(`✗ Kicked: ${reason}`);
    bot = null;
    reconnect();
  });

  bot.on('error', (err) => {
    log(`✗ Error: ${err.message}`);
    bot = null;
    reconnect();
  });

  bot.on('end', () => {
    log('✗ Disconnected');
    bot = null;
    reconnect();
  });

  bot.on('health', () => {
    if (bot && bot.health <= 0) {
      log('⚠ Died! Respawning...');
      bot.chat('/respawn');
    }
  });
}

function reconnect() {
  reconnectAttempts++;
  const delay = Math.min(reconnectAttempts * 10000, 60000); // Max 1 minute
  log(`Reconnecting in ${delay/1000}s... (Attempt ${reconnectAttempts})`);
  setTimeout(createBot, delay);
}

// ============================================
// START
// ============================================
console.log('='.repeat(60));
console.log('🎮 MINECRAFT KEEPALIVE BOT - RAILWAY EDITION');
console.log('='.repeat(60));
console.log(`Server: ${CONFIG.SERVER_HOST}:${CONFIG.SERVER_PORT}`);
console.log(`Username: ${CONFIG.BOT_USERNAME}`);
console.log(`Version: ${CONFIG.MC_VERSION}`);
console.log(`Web Port: ${CONFIG.WEB_PORT}`);
console.log('='.repeat(60));

if (CONFIG.SERVER_HOST === 'YourServer.aternos.me') {
  console.log('\n⚠️  WARNING: Set SERVER_HOST environment variable on Railway!');
  console.log('Go to Variables tab and add your Aternos server address\n');
}

createBot();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  if (bot) bot.quit();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  if (bot) bot.quit();
  process.exit(0);
});