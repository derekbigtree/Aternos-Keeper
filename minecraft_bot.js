const mineflayer = require('mineflayer');
const express = require('express');

const CONFIG = {
  SERVER_HOST: process.env.SERVER_HOST || 'ThatLifeStealSMP.aternos.me',
  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 11827,
  BOT_USERNAME: process.env.BOT_USERNAME || 'BOT',
  MC_VERSION: process.env.MC_VERSION || '1.21',
  WEB_PORT: process.env.PORT || 3000
};

const app = express();
let bot = null;

app.get('/', (req, res) => {
  res.send(`<h1>Bot: ${bot ? 'Online' : 'Offline'}</h1>`);
});

app.listen(CONFIG.WEB_PORT, () => console.log('Web server running'));

function createBot() {
  bot = mineflayer.createBot({
    host: CONFIG.SERVER_HOST,
    port: CONFIG.SERVER_PORT,
    username: CONFIG.BOT_USERNAME,
    version: CONFIG.MC_VERSION
  });

  bot.on('spawn', () => console.log('Connected'));
  bot.on('end', () => { bot = null; setTimeout(createBot, 10000); });
  bot.on('error', () => {});
}

createBot();