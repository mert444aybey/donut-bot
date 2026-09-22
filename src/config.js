'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '..');

// SABIT AYARLAR (panelden degismez)
const CFG = {
  host: 'mc.donutsmp.net',
  version: '1.21',
  username: process.env.MC_USER || 'senin_mail_adresin@example.com',
  panelPort: 3007,
  settingsFile: path.join(ROOT, 'settings.json'),
  statsFile: path.join(ROOT, 'stats.json'),

  reconnectDelayMs: 15000,
  autoRestartDelayMs: 5 * 60 * 1000,
  windowTimeoutMs: 8000,
  signWaitMs: 5000,
  signTypeDelayMs: 900,
  reopenWaitMs: 12000,
  slotWaitMs: 4000,
  holdSyncMs: 1000,
  cycleDelayMs: 3000,

  orderCompleteRegex: /(?:your\s+.*order|order).*(?:complete|fulfilled|finished|tamamland)/i,
  orderCompleteTimeoutMs: 60 * 60 * 1000,

  // Toplama: /orders -> 51 -> 0 -> 13 -> "Collect Items" penceresinde slot 0'dan shift-click
  COLLECT_PATH: [
    { slot: 51, expectWindow: true },
    { slot: 0,  expectWindow: true },
    { slot: 13, expectWindow: true },
  ],
  collectSlot: 0,
  collectMaxRounds: 5,
  shiftWaitMs: 1200,

  // Satis
  listedRegex: /you listed/i,
  sellVerifyMs: 9000,
  spamRetryDelayMs: 4000,
  spamMaxRetries: 3,
  closeInvBeforeCmd: true,
  confirmWaitMs: 20000,
  ahConfirmTitle: /confirm listing/i,
  ahConfirmSlot: 15,
  ahConfirmItemRegex: /lime|green/i,
  ahConfirmCancelSlot: 11,
  ahConfirmCancelRegex: /red/i,
  ahConfirmDelayMs: 2000,

  // Piyasa fiyati arama (otomatik ucuzlatma)
  marketWindowTimeoutMs: 8000,
  marketReadDelayMs: 400,

  // Satis bekleme
  salesHeartbeatMs: 10 * 60 * 1000,

  // Bakiye ve Anti-AFK
  balanceCheckIntervalMs: 10 * 60 * 1000, // 10 dakikada bir kontrol
  antiAfkIntervalMs: 25 * 1000,

  // Ilan guncelleme / Undercut kontrolu
  relistCheckIntervalMs: 90 * 1000, // 1.5 dakikada bir kontrol

  // Kesif
  probeSyncMs: 800,
};

module.exports = CFG;
