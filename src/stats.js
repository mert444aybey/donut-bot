'use strict';

const fs = require('fs');
const CFG = require('./config');
const state = require('./state');
const { log } = require('./logger');
const { parsePrices } = require('./utils/inspect');

const DEFAULT_STATS = {
  startedAt: Date.now(),
  totalSpent: 0,            // siparislere harcanan toplam para
  totalRevenue: 0,          // satislardan gelen toplam para (chat'ten okunan veya tahmini)
  ordersPlaced: 0,          // verilen siparis sayisi
  itemsOrdered: 0,          // siparis edilen toplam item adedi
  listingsCreated: 0,       // ah'ta acilan ilan sayisi
  itemsListed: 0,           // ilana konan toplam item adedi
  salesDetected: 0,         // algilanan satis (chat mesaji) sayisi
  revenueExactCount: 0,     // fiyati chat mesajindan tam okunan satis sayisi
  revenueEstimatedCount: 0, // fiyati tahmin edilen (son ilan fiyati kullanilan) satis sayisi
  cyclesCompleted: 0,       // tamamlanan tam dongu sayisi
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

function bumpStats(patch) {
  for (const [k, v] of Object.entries(patch)) {
    state.STATS[k] = (state.STATS[k] || 0) + v;
  }
  saveStats();
  emitStats();
}

function resetStats() {
  state.STATS = { ...DEFAULT_STATS, startedAt: Date.now() };
  saveStats();
  emitStats();
  log('Istatistikler sifirlandi.');
  return state.STATS;
}

// Bir satis chat mesajindan $ tutari okumaya calisir, bulamazsa null doner.
function parseSaleAmount(m) {
  const prices = parsePrices(m);
  if (prices.length) return prices[prices.length - 1].value;
  return null;
}

state.STATS = loadStats();

module.exports = { DEFAULT_STATS, loadStats, saveStats, emitStats, bumpStats, resetStats, parseSaleAmount };
