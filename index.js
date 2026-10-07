'use strict';

const { spawn } = require('child_process');
const path = require('path');

// Eğer --app veya --gui argümanı verildiyse masaüstü uygulamasını aç
if (process.argv.includes('--app') || process.argv.includes('--gui')) {
  const electronBin = require('electron');
  const child = spawn(electronBin, [path.join(__dirname, 'desktop', 'main.js')], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('close', (code) => process.exit(code || 0));
  return;
}

require('./src/settings'); // settings.json'u yukler
require('./src/stats');    // stats.json'u yukler

const { log } = require('./src/logger');
const web = require('./src/web/server');
const { createBot } = require('./src/bot');
const { startWatchdog } = require('./src/features/watchdog');

process.on('unhandledRejection', (e) => log(`unhandledRejection: ${e && e.message}`));
process.on('uncaughtException', (e) => log(`uncaughtException: ${e.message}`));

web.start();
log('💻 Masaüstü Uygulaması: ./start.sh veya npm run app ile doğrudan açabilirsiniz.');
createBot();
startWatchdog();
