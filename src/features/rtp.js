'use strict';

const state = require('../state');
const { log } = require('../logger');
const { sleep, humanSleep } = require('../utils/text');
const { closeWindowSafe } = require('../utils/windows');
const { stopAutomation, startAutomation } = require('./automation');

/**
 * 🌍 Güvenli Rastgele Işınlanma (RTP)
 *
 * 1. Otomasyonu ve hareketi geçici olarak durdurur (DonutSMP 5 sn kıpırdama kuralı).
 * 2. /rtp komutunu gönderir.
 * 3. Menü açılırsa Overworld/Dünya slotunu seçer.
 * 4. Işınlanma tamamlanana kadar (konum değişene kadar) tamamen sabit bekler.
 * 5. Işınlanma sonrasında otomasyonu kaldığı yerden otonom devam ettirir.
 */
async function rtpToWild() {
  const bot = state.bot;
  if (!bot || !bot.entity) {
    log('❌ [RTP] Bot sunucuya bağlı değil.');
    return false;
  }

  log('🌍 [RTP] Güvenli rastgele ışınlanma başlatılıyor...');
  const wasRunning = state.running;
  if (wasRunning) {
    log('⏸️ [RTP] Işınlanma süresince otomasyon geçici olarak duraklatılıyor...');
    stopAutomation();
    await sleep(500);
  }

  closeWindowSafe();
  await sleep(400);

  const initialPos = bot.entity.position.clone();
  log(`📍 [RTP] Mevcut konum: X: ${initialPos.x.toFixed(0)}, Y: ${initialPos.y.toFixed(0)}, Z: ${initialPos.z.toFixed(0)}`);

  bot.chat('/rtp');
  log('📡 [RTP] /rtp komutu gönderildi. Yanıt ve menü kontrol ediliyor...');

  // 1.5 sn menü açılmasını bekle
  await sleep(1500);

  if (bot.currentWindow && bot.currentWindow !== bot.inventory) {
    const win = bot.currentWindow;
    log(`🧭 [RTP] Menü açıldı: "${win.title || 'RTP'}" (Slot sayısı: ${win.inventoryStart})`);
    
    // Overworld / Dünya / Orman slotunu bul (grass_block, oak_sapling, compass veya ilk geçerli slot)
    let pickSlot = -1;
    for (let s = 0; s < win.inventoryStart; s++) {
      const it = win.slots[s];
      if (!it || it.name.includes('glass') || it.name === 'barrier') continue;
      const text = ((it.displayName || '') + ' ' + it.name).toLowerCase();
      if (text.includes('overworld') || text.includes('dünya') || text.includes('grass') || text.includes('wild')) {
        pickSlot = s;
        break;
      }
    }

    if (pickSlot === -1) {
      // Varsayılan olarak ortadaki veya ilk tıklanabilir eşyayı seç
      for (let s = 0; s < win.inventoryStart; s++) {
        const it = win.slots[s];
        if (it && !it.name.includes('glass') && it.name !== 'barrier') {
          pickSlot = s;
          break;
        }
      }
    }

    if (pickSlot !== -1) {
      log(`🎯 [RTP] Dünya seçimi yapılıyor (Slot ${pickSlot})...`);
      try {
        await bot.clickWindow(pickSlot, 0, 0);
      } catch (_) {}
      await sleep(500);
    }
  }

  log('⏳ [RTP] Işınlanma bekleniyor (5-10 sn kıpırdamadan bekleniyor)...');
  const startWait = Date.now();
  let teleported = false;

  while (Date.now() - startWait < 12000) {
    await sleep(500);
    if (!state.bot || !state.bot.entity) break;

    const curPos = state.bot.entity.position;
    const dist = curPos.distanceTo(initialPos);
    if (dist > 30) {
      log(`✨ [RTP] BAŞARILI! Yeni konuma ışınlanıldı: X: ${curPos.x.toFixed(0)}, Y: ${curPos.y.toFixed(0)}, Z: ${curPos.z.toFixed(0)} (Mesafe: ${dist.toFixed(0)} blok)`);
      teleported = true;
      break;
    }
  }

  if (!teleported) {
    log('⚠️ [RTP] Konum değişikliği algılanmadı veya ışınlanma zaman aşımına uğradı.');
  }

  await sleep(1000);
  if (wasRunning) {
    log('🚀 [RTP] Otomasyon (1B İmparatorluk Modu) kaldığı yerden yeniden başlatılıyor...');
    startAutomation('billionaire');
  }

  return teleported;
}

module.exports = { rtpToWild };
