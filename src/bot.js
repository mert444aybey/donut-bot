'use strict';

const mineflayer = require('mineflayer');
const CFG = require('./config');
const state = require('./state');
const { log, dlog } = require('./logger');
const { sleep, titleOf } = require('./utils/text');
const { pushSnapshot } = require('./features/probe');

const CHAT_INTERESTING = /order|listed|listing|sold|auction|limit|cooldown|not enough|cannot|can't|invalid|error|do not repeat|full|too fast|purchased|bought|balance|bakiye/i;

let balanceTimer = null;
let updateSnapshotDebounce = null;

function scheduleSnapshot(delayMs = 200) {
  if (updateSnapshotDebounce) clearTimeout(updateSnapshotDebounce);
  updateSnapshotDebounce = setTimeout(() => {
    updateSnapshotDebounce = null;
    pushSnapshot();
  }, delayMs);
}

// Bakiye mesajlarindan sayisal degeri cikarir.
// Desteklenen formatlar:
//   "You have $ 21,416,612"
//   "Balance: $21,416,612"
//   "Bakiye: $21.416.612"    (Turkce binlik ayiraci)
//   "You have $21416612"
//   "Your balance: $ 1,234.56"
function parseBalance(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Minecraft renk kodlarini (§a vs.) ve ozel bosluk karakterlerini temizle
  const text = rawText
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .trim();

  // Once "You have $ XXX" formatini dene (Donut SMP'nin orijinal mesaji)
  const youHaveMatch = /you have\s*\$\s*([\d,.\s]+)/i.exec(text);
  if (youHaveMatch) {
    const num = normalizeNumber(youHaveMatch[1]);
    if (num !== null) return num;
  }

  // Diger bakiye formatlari (balance, bakiye, cuzdan, bank vb.)
  const genericMatch = /(?:balance|bakiye|cuzdan|money|wallet|bank|purse)\s*(?:is|:|=)?\s*\$?\s*([\d,.\s]+)/i.exec(text);
  if (genericMatch) {
    const num = normalizeNumber(genericMatch[1]);
    if (num !== null) return num;
  }

  // Son care: mesajin icindeki $ isaretinden sonraki sayiyi dene
  const dollarMatch = /\$\s*([\d,.\s]+)/i.exec(text);
  if (dollarMatch) {
    const num = normalizeNumber(dollarMatch[1]);
    if (num !== null) return num;
  }

  return null;
}

// "21,416,612" veya "21.416.612" veya "21416612" -> 21416612
// "1,234.56" -> 1234.56  (ondalik var)
function normalizeNumber(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;

  // Bosluklari kaldir
  s = s.replace(/\s/g, '');

  // Sayinin icinde hem . hem , varsa hangisinin ondalik, hangisinin binlik oldugunu anla
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot > lastComma) {
      // 1,234,567.89 -> virgul binlik, nokta ondalik
      s = s.replace(/,/g, '');
    } else {
      // 1.234.567,89 -> nokta binlik, virgul ondalik (TR formati)
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasDot) {
    // Sadece nokta var. Eger birden fazla nokta varsa hepsi binlik ayiraci (21.416.612)
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      s = s.replace(/\./g, '');
    } else {
      const afterDot = s.split('.')[1];
      if (afterDot && afterDot.length === 3) {
        s = s.replace('.', ''); // Binlik ayiraci (21.416)
      }
    }
  } else if (hasComma) {
    // Sadece virgul var.
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1) {
      s = s.replace(/,/g, '');
    } else {
      const afterComma = s.split(',')[1];
      if (afterComma && afterComma.length === 3) {
        s = s.replace(',', ''); // Binlik ayiraci
      } else {
        s = s.replace(',', '.'); // Ondalik
      }
    }
  }

  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function queryBalance() {
  if (state.bot && state.bot.entity) {
    state.bot.chat('/bal');
  }
}

function startAntiAfk() {
  if (state.antiAfkTimer) clearInterval(state.antiAfkTimer);
  state.antiAfkTimer = setInterval(async () => {
    const S = state.S;
    if (!S || S.antiAfk === false) return;
    const bot = state.bot;
    if (!bot || !bot.entity) return;
    if (bot.currentWindow && bot.currentWindow !== bot.inventory) return;
    if (state.lastSignPacket) return;

    try {
      const newYaw = bot.entity.yaw + (Math.random() - 0.5) * 0.4;
      const newPitch = Math.max(-0.6, Math.min(0.6, bot.entity.pitch + (Math.random() - 0.5) * 0.2));
      await bot.look(newYaw, newPitch, true);

      if (Math.random() < 0.4) {
        bot.setControlState('sneak', true);
        setTimeout(() => {
          try { if (state.bot) state.bot.setControlState('sneak', false); } catch (_) {}
        }, 300);
      }
    } catch (_) {}
  }, CFG.antiAfkIntervalMs);
}

function safeReconnect(reason) {
  state.setBotConnected(false);
  if (state.manualStop) return; // Kullanici elle cikis yaptiysa tekrar baglanma
  if (state.reconnecting) return;
  state.reconnecting = true;
  state.setRunning(false);
  state.cancelToken++;
  if (state.antiAfkTimer) { clearInterval(state.antiAfkTimer); state.antiAfkTimer = null; }
  if (balanceTimer) { clearInterval(balanceTimer); balanceTimer = null; }
  log(`Baglanti koptu: ${reason}. ${CFG.reconnectDelayMs / 1000} sn sonra yeniden baglanilacak.`);
  try { if (state.bot) state.bot.removeAllListeners(); } catch (_) {}
  setTimeout(() => { state.reconnecting = false; createBot(); }, CFG.reconnectDelayMs);
}

function quitBot() {
  state.manualStop = true;
  state.setRunning(false);
  state.setBotConnected(false);
  if (state.autoRestartTimer) { clearTimeout(state.autoRestartTimer); state.autoRestartTimer = null; }
  if (state.antiAfkTimer) { clearInterval(state.antiAfkTimer); state.antiAfkTimer = null; }
  if (balanceTimer) { clearInterval(balanceTimer); balanceTimer = null; }

  if (state.bot) {
    try {
      state.bot.quit('Panelden cikis yapildi');
    } catch (_) {}
    try { state.bot.removeAllListeners(); } catch (_) {}
    state.bot = null;
  }
  log('🚪 Bot sunucudan cikis yapti.');
}

function joinBot() {
  if (state.bot && state.bot.entity) {
    log('Bot zaten oyunda.');
    return;
  }
  state.manualStop = false;
  state.reconnecting = false;
  log('⚡ Bot sunucuya baglaniyor...');
  createBot();
}

function createBot() {
  log('Sunucuya baglaniliyor...');
  const bot = mineflayer.createBot({
    host: CFG.host,
    version: CFG.version,
    username: CFG.username,
    auth: 'microsoft',
  });
  state.bot = bot;

  bot.once('spawn', () => {
    try { state.ChatMessage = require('prismarine-chat')(bot.registry); } catch (_) { state.ChatMessage = null; }
    state.setBotConnected(true);
    log('🟢 Bot oyunda. Panelden bir islem secebilirsin.');
    startAntiAfk();
    setTimeout(() => queryBalance(), 3000);
    if (balanceTimer) clearInterval(balanceTimer);
    balanceTimer = setInterval(() => {
      if (!state.bot || !state.bot.currentWindow || state.bot.currentWindow === state.bot.inventory) {
        queryBalance();
      }
    }, CFG.balanceCheckIntervalMs);

    // Envanter degisikliklerini kesif sayfasina canli aktar
    try {
      bot.inventory.on('updateSlot', () => scheduleSnapshot(150));
    } catch (_) {}
  });

  bot.on('windowOpen', async (w) => {
    dlog(`Pencere acildi: id=${w.id} "${titleOf(w)}"`);
    try {
      w.on('updateSlot', () => scheduleSnapshot(100));
    } catch (_) {}
    scheduleSnapshot(300);
  });

  bot.on('windowClose', () => {
    scheduleSnapshot(100);
  });

  bot.on('playerCollect', (collector) => {
    try { if (bot.entity && collector && collector.id === bot.entity.id) scheduleSnapshot(200); } catch (_) {}
  });

  bot._client.on('open_sign_entity', (packet) => {
    state.lastSignPacket = packet;
    state.io.emit('probe:sign', true);
  });

  bot.on('messagestr', (m) => {
    if (!m.trim()) return;
    state.io.emit('probe:chat', m);
    if (CFG.orderCompleteRegex.test(m)) state.orderComplete = true;
    if (/do not repeat|similar\) message|too fast|slow down/i.test(m)) state.spamSeen = true;

    // Bakiye mesaji yakalama (/bal sonucu)
    const parsedBal = parseBalance(m);
    if (parsedBal !== null) {
      state.setBalance(parsedBal);
      dlog(`Bakiye guncellendi: $${parsedBal.toLocaleString()}`);
    }

    if (state.S && (state.S.verbose || CHAT_INTERESTING.test(m))) {
      log(`chat: ${m}`);
    }
  });

  bot.on('actionBar', (jsonMsg) => {
    try {
      const t = jsonMsg.toString();
      state.io.emit('probe:chat', 'actionbar: ' + t);
      if (CFG.orderCompleteRegex.test(t)) state.orderComplete = true;
      if (state.S && state.S.verbose) log(`actionbar: ${t}`);
    } catch (_) {}
  });

  bot.on('kicked', (r) => {
    state.setBotConnected(false);
    safeReconnect(`kick: ${typeof r === 'string' ? r : JSON.stringify(r)}`);
  });
  bot.on('error', (e) => log(`error: ${e.message}`));
  bot.on('end', (r) => {
    state.setBotConnected(false);
    safeReconnect(`end: ${r}`);
  });
  bot._client.on('error', (e) => log(`client error: ${e.message}`));
}

module.exports = { createBot, safeReconnect, quitBot, joinBot, queryBalance, parseBalance, normalizeNumber };
