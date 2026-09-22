'use strict';

const CFG = require('../config');
const state = require('../state');
const { log } = require('../logger');
const { bumpStats } = require('../stats');
const { sleep, humanSleep } = require('../utils/text');
const { assertActive, closeWindowSafe } = require('../utils/windows');
const { runOrderFlow, waitForOrderComplete } = require('./order');
const { collectItems } = require('./collect');

const MODES = ['full', 'collect'];
const MODE_LABELS = { full: 'tam dongu', collect: 'sadece topla' };

// Kullanici DURDUR'a basmadigi surece, hata veya baglanti kesilmesi sonrasi
// otomasyon kendini yeniden baslatir.
function scheduleAutoRestart(mode, reason) {
  if (state.manualStop) return;
  if (state.autoRestartTimer) return; // zaten bir yeniden baslatma planli
  const mins = Math.round(CFG.autoRestartDelayMs / 60000);
  log(`Otomasyon ${mins} dk sonra otomatik olarak yeniden baslatilacak (${reason}). Iptal icin DURDUR'a basabilirsin.`);
  state.autoRestartTimer = setTimeout(() => {
    state.autoRestartTimer = null;
    if (state.manualStop) return;
    startAutomation(mode);
  }, CFG.autoRestartDelayMs);
}

async function startAutomation(mode) {
  if (!MODES.includes(mode)) mode = 'full';
  if (state.autoRestartTimer) { clearTimeout(state.autoRestartTimer); state.autoRestartTimer = null; }
  state.manualStop = false;

  if (!state.bot || !state.bot.entity) {
    log('Bot henuz oyunda degil.');
    scheduleAutoRestart(mode, 'bot oyunda degil');
    return;
  }
  if (state.running) return log('Zaten calisiyor.');
  state.setRunning(true);
  const token = ++state.cancelToken;
  log(`Basladi: ${MODE_LABELS[mode]}`);

  let hadError = false;
  try {
    await humanSleep(1500);

    if (mode === 'collect') {
      await collectItems(token);
      log('Toplama tamamlandi.');
      return;
    }

    let cycle = 0;
    while (true) {
      assertActive(token);
      cycle++;
      const S = state.S;

      // Coklu item / Portfoy modu devredeyse sira gecisi yap
      if (S.portfolioEnabled && Array.isArray(S.portfolio) && S.portfolio.length > 0) {
        state.activeItemIndex = (cycle - 1) % S.portfolio.length;
        const active = state.getActiveItem();
        log(`===== Dongu ${cycle}${S.maxCycles > 0 ? '/' + S.maxCycles : ''} | Portfoy: ${active.item} (${state.activeItemIndex + 1}/${S.portfolio.length}) =====`);
      } else {
        log(`===== Dongu ${cycle}${S.maxCycles > 0 ? '/' + S.maxCycles : ''} =====`);
      }

      await runOrderFlow(token);
      await waitForOrderComplete(token);
      await collectItems(token);

      bumpStats({ cyclesCompleted: 1 });

      if (S.maxCycles > 0 && cycle >= S.maxCycles) {
        log('Dongu sayisina ulasildi.');
        break;
      }
      await humanSleep(CFG.cycleDelayMs);
    }
  } catch (err) {
    if (err.message !== 'iptal edildi') {
      log(`HATA: ${err.message}`);
      hadError = true;
    } else if (!state.manualStop) {
      // Kullanici DURDUR'a basmadi ama iptal edildi (orn. baglanti koptu) -> yine de yeniden baslat
      hadError = true;
    }
    closeWindowSafe();
  } finally {
    if (token === state.cancelToken) state.setRunning(false);
    if (hadError && !state.manualStop) {
      scheduleAutoRestart(mode, 'hata/baglanti kesilmesi sonrasi');
    }
  }
}

function stopAutomation() {
  state.cancelToken++;
  state.manualStop = true;
  if (state.autoRestartTimer) { clearTimeout(state.autoRestartTimer); state.autoRestartTimer = null; }
  state.setRunning(false);
  closeWindowSafe();
  log('Durduruldu.');
}

module.exports = { MODES, scheduleAutoRestart, startAutomation, stopAutomation };
