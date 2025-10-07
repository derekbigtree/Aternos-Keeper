// ============================================
// ATERNOS AUTO-STARTER - Using Official-ish API
// ============================================

const express = require('express');
const { Client } = require('aternos-api');

const CONFIG = {
  ATERNOS_USERNAME: process.env.ATERNOS_USERNAME || 'TOAD520',
  ATERNOS_PASSWORD: process.env.ATERNOS_PASSWORD || 'd1r1kB0y',
  SERVER_ID: process.env.SERVER_ID || 'ThatLifeStealSMP', // Just the name, not .aternos.me
  CHECK_INTERVAL: 60000, // Check every 60 seconds
  WEB_PORT: process.env.PORT || 3000
};

let client = null;
let server = null;
let serverStatus = {
  isOnline: false,
  lastCheck: null,
  startAttempts: 0,
  lastError: null,
  players: 0
};

// ============================================
// ATERNOS CLIENT
// ============================================

async function initAternos() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Logging into Aternos...`);
    client = await Client.login(CONFIG.ATERNOS_USERNAME, CONFIG.ATERNOS_PASSWORD);
    
    const servers = await client.getServers();
    server = servers.find(s => s.ip.includes(CONFIG.SERVER_ID));
    
    if (!server) {
      throw new Error(`Server ${CONFIG.SERVER_ID} not found`);
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Connected to Aternos`);
    console.log(`[${new Date().toLocaleTimeString()}] Server: ${server.ip}`);
    return true;
  } catch (err) {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Aternos login failed: ${err.message}`);
    serverStatus.lastError = err.message;
    return false;
  }
}

async function checkAndStart() {
  try {
    if (!server) {
      await initAternos();
      if (!server) return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Checking server status...`);
    
    await server.fetch(); // Refresh server info
    const status = server.status;
    
    serverStatus.lastCheck = new Date();
    serverStatus.isOnline = status === 'online';
    serverStatus.players = server.playerCount || 0;

    console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}`);

    if (status === 'offline') {
      console.log(`[${new Date().toLocaleTimeString()}] Server offline, starting...`);
      await server.start();
      serverStatus.startAttempts++;
      console.log(`[${new Date().toLocaleTimeString()}] ✓ Start command sent`);
    } else if (status === 'online') {
      console.log(`[${new Date().toLocaleTimeString()}] ✓ Server is running (${server.playerCount} players)`);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Server status: ${status}`);
    }

    serverStatus.lastError = null;
  } catch (err) {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Error: ${err.message}`);
    serverStatus.lastError = err.message;
    
    // Try to reinit if auth failed
    if (err.message.includes('auth') || err.message.includes('login')) {
      server = null;
      client = null;
    }
  }
}

// ============================================
// WEB DASHBOARD
// ============================================

const app = express();

app.get('/', (req, res) => {
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Aternos Auto-Starter</title>
        <meta http-equiv="refresh" content="30">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
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
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 { 
            font-size: 36px; 
            margin-bottom: 10px; 
            text-align: center;
          }
          .subtitle {
            text-align: center;
            opacity: 0.7;
            margin-bottom: 30px;
          }
          .status { 
            font-size: 32px; 
            margin: 25px 0;
            text-align: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: ${serverStatus.isOnline ? '#4CAF50' : '#ff9800'};
            font-weight: bold;
          }
          .info { 
            font-size: 15px; 
            margin: 12px 0;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
          }
          .error {
            background: rgba(255, 87, 87, 0.2);
            color: #ffcccb;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 14px;
          }
          .footer {
            margin-top: 25px;
            text-align: center;
            opacity: 0.5;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚡ Aternos Auto-Starter</h1>
          <div class="subtitle">Monitoring ${CONFIG.SERVER_ID}.aternos.me</div>
          
          <div class="status">
            ${serverStatus.isOnline ? '✓ Server Online' : '⏳ Starting Server...'}
          </div>
          
          ${serverStatus.lastError ? `<div class="error">Error: ${serverStatus.lastError}</div>` : ''}
          
          <div class="info">
            <span>Players Online:</span>
            <span>${serverStatus.players}</span>
          </div>
          <div class="info">
            <span>Last Check:</span>
            <span>${serverStatus.lastCheck ? serverStatus.lastCheck.toLocaleTimeString() : 'Never'}</span>
          </div>
          <div class="info">
            <span>Start Attempts:</span>
            <span>${serverStatus.startAttempts}</span>
          </div>
          <div class="info">
            <span>Script Uptime:</span>
            <span>${hours}h ${minutes}m</span>
          </div>
          
          <div class="footer">Auto-refreshes every 30 seconds</div>
        </div>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    ...serverStatus,
    server: server ? server.ip : 'Not connected'
  });
});

app.listen(CONFIG.WEB_PORT, '0.0.0.0', () => {
  console.log(`✓ Dashboard: http://localhost:${CONFIG.WEB_PORT}`);
});

// ============================================
// START
// ============================================

console.log('='.repeat(60));
console.log('ATERNOS AUTO-STARTER');
console.log('='.repeat(60));
console.log(`Server ID: ${CONFIG.SERVER_ID}`);
console.log(`Check Interval: ${CONFIG.CHECK_INTERVAL / 1000}s`);
console.log('='.repeat(60));

// Initial check
setTimeout(() => {
  checkAndStart();
  setInterval(checkAndStart, CONFIG.CHECK_INTERVAL);
}, 5000);

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});