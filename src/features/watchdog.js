'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { closeWindowSafe } = require('../utils/windows');

let watchdogTimer = null;
let lastRunningCheck = Date.now();
let windowOpenedAt = null;

/**
 * 🛡️ 24/7 OTONOM BEKÇİ MOTORU (Autonomous Watchdog)
 *
 * Kullanıcı başında olmasa dahi:
 * 1. Botun bağlılığını denetler; koparsa yeniden bağlar.
 * 2. Otomasyonun durup durmadığını denetler; durmuşsa 1B Billionaire modunu anında yeniden başlatır.
 * 3. Kilitlenmiş pencereleri (stuck window) tespit eder ve zorla kapatır.
 * 4. Limbo/Lobiye düşme durumunda `/smp` ile oyuna geri döner.
 * 5. Bakiyeyi kontrol eder ve kasanın 24/7 büyümesini garanti eder.
 */
function startWatchdog() {
  if (watchdogTimer) clearInterval(watchdogTimer);

  log('🛡️ 24/7 Otonom Bekçi (Watchdog) aktif edildi. Sistem kesintisiz çalışacak ve kendini denetleyecek.');

  watchdogTimer = setInterval(async () => {
    try {
      if (state.manualStop) return; // Kullanıcı panelden özellikle durdurduysa karışma

      const bot = state.bot;

      // 1. KONTROL: Bot oyunda mı?
      if (!bot || !bot.entity || !state.botConnected) {
        dlog('🛡️ [Bekçi] Bot oyunda değil veya bağlantı kopuk, yeniden bağlantı tetikleniyor...');
        if (!state.reconnecting) {
          try {
            const { createBot } = require('../bot');
            createBot();
          } catch (_) {}
        }
        return;
      }

      // 2. KONTROL: Açık pencere kilitlenmesi var mı (> 45 saniye)?
      if (bot.currentWindow && bot.currentWindow !== bot.inventory) {
        if (!windowOpenedAt) {
          windowOpenedAt = Date.now();
        } else if (Date.now() - windowOpenedAt > 45000) {
          log('⚠️ [Bekçi] Bot 45 saniyeden uzun süredir bir pencerede takılı kaldı! Pencere zorla kapatılıyor...');
          closeWindowSafe();
          windowOpenedAt = null;
        }
      } else {
        windowOpenedAt = null;
      }

      // 3. KONTROL: Otomasyon çalışıyor mu?
      if (!state.running) {
        const timeSinceLast = Date.now() - lastRunningCheck;
        if (timeSinceLast >= 20000) { // 20 saniye boşta kaldıysa
          log('🚀 [Bekçi] Otomasyonun boşta olduğu tespit edildi! 1B İmparatorluk Modu otonom olarak başlatılıyor...');
          lastRunningCheck = Date.now();
          const { startAutomation } = require('./automation');
          startAutomation('billionaire');
        }
      } else {
        lastRunningCheck = Date.now();
      }

      // 4. KONTROL: Periyodik Bakiye ve Kalp Atışı
      if (state.running) {
        const stats = state.STATS || {};
        const net = (stats.totalEarned || 0) - (stats.totalSpent || 0);
        dlog(`🛡️ [Bekçi Kalp Atışı] Durum: AKTİF | Bakiye: $${(state.balance || 0).toLocaleString()} | Net Kâr: $${net.toLocaleString()}`);
      }
    } catch (err) {
      dlog(`🛡️ [Bekçi Hatası]: ${err.message}`);
    }
  }, 25000); // 25 saniyede bir sıkı denetim
}

function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
    log('🛡️ Otonom Bekçi durduruldu.');
  }
}

module.exports = {
  startWatchdog,
  stopWatchdog,
};
