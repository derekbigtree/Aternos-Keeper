const mineflayer = require('mineflayer');

// Configuration
const config = {
  host: 'ThatLifeStealSMP.aternos.me', // Replace with your Aternos server address
  port: 11827, // Default Minecraft port
  username: 'BOT', // Bot's username (change if you want)
  version: '1.21', // Minecraft version - adjust to match your server
  auth: 'offline' // Use 'microsoft' if you want to use a real Microsoft account
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 5000; // 5 seconds

function createBot() {
  console.log(`[${new Date().toLocaleTimeString()}] Creating bot...`);
  
  const bot = mineflayer.createBot(config);

  // Bot spawned successfully
  bot.on('spawn', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Bot spawned successfully!`);
    console.log(`[${new Date().toLocaleTimeString()}] Connected to: ${config.host}`);
    reconnectAttempts = 0; // Reset reconnect counter on successful connection
    
    // Send a message to confirm the bot is online (optional)
    setTimeout(() => {
      bot.chat('Keepalive bot is now active!');
    }, 2000);
  });

  // Handle chat messages
  bot.on('chat', (username, message) => {
    if (username === bot.username) return; // Ignore own messages
    
    console.log(`[${new Date().toLocaleTimeString()}] <${username}> ${message}`);
    
    // Optional: Respond to commands
    if (message.toLowerCase() === '!status') {
      const uptime = Math.floor(bot.time.age / 20); // Convert ticks to seconds
      bot.chat(`Bot online for ${uptime} seconds. Players: ${Object.keys(bot.players).length}`);
    }
  });

  // Handle whispers (private messages)
  bot.on('whisper', (username, message) => {
    console.log(`[${new Date().toLocaleTimeString()}] [PM] ${username}: ${message}`);
  });

  // Keep the bot from getting kicked for being AFK
  bot.on('physicsTick', () => {
    // Every 30 seconds, perform a small action to prevent AFK kick
    if (bot.time.age % 600 === 0) { // 600 ticks = 30 seconds
      // Look around randomly
      bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
    }
  });

  // Handle kicked event
  bot.on('kicked', (reason) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Bot was kicked!`);
    console.log(`[${new Date().toLocaleTimeString()}] Reason: ${reason}`);
    attemptReconnect();
  });

  // Handle errors
  bot.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] ✗ Error occurred:`, err.message);
    attemptReconnect();
  });

  // Handle disconnections
  bot.on('end', (reason) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Bot disconnected!`);
    console.log(`[${new Date().toLocaleTimeString()}] Reason: ${reason || 'Unknown'}`);
    attemptReconnect();
  });

  // Health monitoring
  bot.on('health', () => {
    if (bot.health <= 0) {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠ Bot died! Respawning...`);
      bot.chat('/respawn');
    }
  });

  return bot;
}

function attemptReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Max reconnect attempts reached. Stopping bot.`);
    process.exit(1);
  }

  reconnectAttempts++;
  console.log(`[${new Date().toLocaleTimeString()}] Attempting to reconnect in ${reconnectDelay/1000} seconds... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  setTimeout(() => {
    createBot();
  }, reconnectDelay);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toLocaleTimeString()}] Shutting down bot gracefully...`);
  process.exit(0);
});

// Start the bot
console.log('='.repeat(50));
console.log('Minecraft Keepalive Bot Starting...');
console.log('='.repeat(50));
createBot();