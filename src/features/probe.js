'use strict';

const CFG = require('../config');
const state = require('../state');
const { sleep } = require('../utils/text');
const { snapshotFull } = require('../utils/inspect');
const { submitSign, closeWindowSafe } = require('../utils/windows');

function pushSnapshot() {
  try {
    if (state.io) state.io.emit('probe:snapshot', snapshotFull());
  } catch (e) {
    if (state.io) state.io.emit('probe:msg', 'Envanter/pencere okunamadi: ' + e.message);
  }
}

// Kesif sayfasindan gelen komutlari uygular (sadece elle verilen komutlar)
async function probeAction(p) {
  const say = (m) => state.io.emit('probe:msg', m);
  const bot = state.bot;
  if (!p || typeof p !== 'object') return;

  // Yenileme her zaman calisabilir (otomasyon acikken bile izlemeye izin ver)
  if (p.type === 'refresh') {
    pushSnapshot();
    return;
  }

  if (state.running) return say('Otomasyon calisiyor. Tiklama veya komut gondermek icin once DURDUR.');
  if (!bot || !bot.entity) return say('Bot henuz oyunda degil.');

  try {
    switch (p.type) {
      case 'chat': {
        const text = String(p.text || '').slice(0, 256);
        if (!text.trim()) return;
        bot.chat(text);
        say('Gonderildi: ' + text);
        return;
      }
      case 'refresh':
        pushSnapshot();
        return;
      case 'close':
        closeWindowSafe();
        await sleep(400);
        pushSnapshot();
        return;
      case 'click': {
        const win = bot.currentWindow || bot.inventory;
        if (!win) return say('Envanter/pencere yok.');
        const slot = Number(p.slot);
        if (!Number.isInteger(slot) || slot < 0 || slot >= win.slots.length) return say('Gecersiz slot.');
        const it = win.slots[slot];

        let mouseButton = 0;
        let windowMode = 0;
        let modeLabel = '';
        if (p.mode === 'shift') { windowMode = 1; modeLabel = ' [shift]'; }
        else if (p.mode === 'right') { mouseButton = 1; modeLabel = ' [sag tik]'; }

        say(`Tiklaniyor: slot ${slot} (${it ? it.name : 'bos'})${modeLabel}`);
        await bot.clickWindow(slot, mouseButton, windowMode);
        await sleep(CFG.probeSyncMs);
        pushSnapshot();
        return;
      }
      case 'sign': {
        if (!state.lastSignPacket) return say('Acik tabela editoru yok.');
        const text = String(p.text || '').slice(0, 64);
        submitSign(state.lastSignPacket, text);
        state.lastSignPacket = null;
        state.io.emit('probe:sign', false);
        say('Tabelaya yazildi: ' + text);
        await sleep(1500);
        pushSnapshot();
        return;
      }
      default:
        return say('Bilinmeyen komut.');
    }
  } catch (e) {
    say('HATA: ' + e.message);
  }
}

module.exports = { pushSnapshot, probeAction };
