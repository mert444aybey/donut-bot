'use strict';

// Giris noktasi: node index.js
// Tum mantik src/ altindaki modullerdedir (bkz. PROJE_HARITASI.md).

require('./src/settings'); // settings.json'u yukler
require('./src/stats');    // stats.json'u yukler

const { log } = require('./src/logger');
const web = require('./src/web/server');
const { createBot } = require('./src/bot');

process.on('unhandledRejection', (e) => log(`unhandledRejection: ${e && e.message}`));
process.on('uncaughtException', (e) => log(`uncaughtException: ${e.message}`));

web.start();
createBot();
