'use strict';

const fs = require('fs');
const CFG = require('./config');
const state = require('./state');
const { log } = require('./logger');

const DEFAULT_STATS = {
  startedAt: Date.now(),
  totalSpent: 0,            // siparislere harcanan toplam para
  ordersPlaced: 0,          // verilen siparis sayisi
  itemsOrdered: 0,          // siparis edilen toplam item adedi
  cyclesCompleted: 0,       // tamamlanan tam dongu sayisi
  itemsCollected: {},       // item ID bazli toplanan adetler { gold_block: 30 }
  history: [],              // zaman serisi veri noktalari (grafik icin) [{ time, balance, spent }]
};

function loadStats() {
  try {
    if (!fs.existsSync(CFG.statsFile)) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(fs.readFileSync(CFG.statsFile, 'utf8'));
    return { ...DEFAULT_STATS, ...parsed };
  } catch (e) {
    console.log('stats.json okunamadi, sifirdan baslaniyor: ' + e.message);
    return { ...DEFAULT_STATS };
  }
}

function saveStats() {
  try {
    fs.writeFileSync(CFG.statsFile, JSON.stringify(state.STATS, null, 2), 'utf8');
  } catch (e) {
    log(`stats.json yazilamadi: ${e.message}`);
  }
}

function emitStats() {
  if (state.io) state.io.emit('stats', state.STATS);
}

function recordHistoryPoint(balanceOverride) {
  if (!state.STATS) return;
  if (!Array.isArray(state.STATS.history)) state.STATS.history = [];

  const bal = balanceOverride !== undefined ? balanceOverride : state.balance;
  const now = Date.now();
  const last = state.STATS.history[state.STATS.history.length - 1];

  // Cok sik ayni noktayi kaydetme (en az 10 saniye fark)
  if (last && now - last.time < 10000 && last.balance === bal && last.spent === state.STATS.totalSpent) {
    return;
  }

  state.STATS.history.push({
    time: now,
    balance: bal !== null && bal !== undefined ? bal : 0,
    spent: state.STATS.totalSpent || 0,
    orders: state.STATS.ordersPlaced || 0,
  });

  // En fazla son 60 veri noktasini sakla
  if (state.STATS.history.length > 60) {
    state.STATS.history = state.STATS.history.slice(-60);
  }

  saveStats();
  emitStats();
}

function recordItemCollected(itemId, count) {
  if (!itemId || !count || count <= 0) return;
  if (!state.STATS.itemsCollected) state.STATS.itemsCollected = {};
  state.STATS.itemsCollected[itemId] = (state.STATS.itemsCollected[itemId] || 0) + count;
  saveStats();
  emitStats();
}

function bumpStats(patch) {
  for (const [k, v] of Object.entries(patch)) {
    state.STATS[k] = (state.STATS[k] || 0) + v;
  }
  recordHistoryPoint();
  saveStats();
  emitStats();
}

function resetStats() {
  state.STATS = { ...DEFAULT_STATS, startedAt: Date.now(), history: [], itemsCollected: {} };
  saveStats();
  emitStats();
  log('Istatistikler sifirlandi.');
  return state.STATS;
}

state.STATS = loadStats();

module.exports = {
  DEFAULT_STATS,
  loadStats,
  saveStats,
  emitStats,
  bumpStats,
  resetStats,
  recordHistoryPoint,
  recordItemCollected,
};
