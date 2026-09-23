'use strict';

const fs = require('fs');
const CFG = require('./config');
const state = require('./state');
const { log, dlog } = require('./logger');

const DEFAULT_STATS = {
  startedAt: Date.now(),
  totalSpent: 0,            // Siparislere ve alimlara harcanan toplam para (EXPENSE)
  totalEarned: 0,           // Gerceklesen satislardan kazanilan net nakit gelir (INCOME)
  activeListingValue: 0,    // AH uzerindeki aktif ilanlarin toplam liste fiyati (LISTING)
  activeListingCost: 0,     // AH uzerindeki aktif ilanlarin toplam maliyeti
  ordersPlaced: 0,          // Verilen siparis sayisi
  itemsOrdered: 0,          // Siparis edilen toplam item adedi
  cyclesCompleted: 0,       // Tamamlanan tam dongu sayisi
  godHelmetsCrafted: 0,     // Uretilen god helmet sayisi
  itemsCollected: {},       // Item ID bazli toplanan adetler { gold_block: 30 }
  categories: {},           // Kategori bazli harcama, gelir ve ilanlar { 'God Helmet': { spent, earned, listingValue, count } }
  activeListings: [],       // AH'de satisi bekleyen aktif ilanlar [{ id, time, item, amount, unitPrice, total, unitCost, totalCost, note }]
  ledger: [],               // Detayli islem gecmisi [{ id, time, type: 'INCOME'|'EXPENSE'|'LISTING', category, item, amount, unitPrice, total, cost, profit, note }]
  history: [],              // Zaman serisi veri noktalari [{ time, balance, spent, earned }]
};

// 1 adet God Helmet'ın güncel ayarlar bazındaki birim maliyet dökümünü hesaplar
function calculateUnitEconomics() {
  const S = state.S || {};
  const helmetCost = S.diamondHelmetOrderPrice || S.diamondHelmetCost || 25000;
  const blastCost = S.bookBlastOrderPrice || S.bookBlastCost || 15000;
  const respCost = S.bookRespOrderPrice || S.bookRespCost || 15000;
  const mendingCost = S.bookMendingOrderPrice || S.bookMendingCost || 25000;
  const unbCost = S.bookUnbOrderPrice || S.bookUnbCost || 15000;
  const aquaCost = S.bookAquaOrderPrice || S.bookAquaCost || 10000;
  const booksCost = blastCost + respCost + mendingCost + unbCost + aquaCost;

  const bottlePrice = S.xpBottleOrderPrice || 250;
  const bottlesUsed = 50; // 5 adımda ortalama harcanan şişe
  const xpCost = bottlePrice * bottlesUsed;

  const anvilDepreciation = 3000; // Örs aşınma payı (40 örs / ~200 combine)
  const totalUnitCost = helmetCost + booksCost + xpCost + anvilDepreciation;

  const avgSellPrice = Math.max(900000, S.godHelmetSellPrice || 900000);
  const expectedProfit = Math.max(0, avgSellPrice - totalUnitCost);
  const marginPct = totalUnitCost > 0 ? Math.round((expectedProfit / avgSellPrice) * 100) : 0;

  return {
    helmetCost,
    blastCost,
    respCost,
    mendingCost,
    unbCost,
    aquaCost,
    booksCost,
    bottlePrice,
    bottlesUsed,
    xpCost,
    anvilDepreciation,
    totalUnitCost,
    avgSellPrice,
    expectedProfit,
    marginPct,
  };
}

// Eski veya tutarsiz ledger kayitlarini migrate eder ve toplamları yeniden hesaplar
function sanitizeAndSyncStats(st) {
  if (!st) return { ...DEFAULT_STATS };
  if (!Array.isArray(st.ledger)) st.ledger = [];
  if (!Array.isArray(st.history)) st.history = [];
  if (!Array.isArray(st.activeListings)) st.activeListings = [];
  if (!st.categories || typeof st.categories !== 'object') st.categories = {};
  if (!st.itemsCollected || typeof st.itemsCollected !== 'object') st.itemsCollected = {};

  let totalSpent = 0;
  let totalEarned = 0;
  let activeListingValue = 0;
  let activeListingCost = 0;
  const categories = {};

  // Eski versiyonlarda "/ah satışa konuldu" notuna sahip ama yanlışlıkla 'INCOME' yazılmış kayıtları 'LISTING'e dönüştür
  for (const tx of st.ledger) {
    if (tx.type === 'INCOME' && tx.note && (tx.note.includes('satışa konuldu') || tx.note.includes('satışa sunuldu') || tx.note.includes('listelendi'))) {
      tx.type = 'LISTING';
    }

    const catKey = tx.category || 'Diger';
    if (!categories[catKey]) {
      categories[catKey] = { spent: 0, earned: 0, listingValue: 0, count: 0 };
    }
    categories[catKey].count = (categories[catKey].count || 0) + (tx.amount || 1);

    const val = tx.total || 0;
    if (tx.type === 'EXPENSE') {
      totalSpent += val;
      categories[catKey].spent += val;
    } else if (tx.type === 'INCOME') {
      totalEarned += val;
      categories[catKey].earned += val;
    } else if (tx.type === 'LISTING') {
      activeListingValue += val;
      activeListingCost += (tx.cost || 0);
      categories[catKey].listingValue = (categories[catKey].listingValue || 0) + val;
      if (st.activeListings.length < 50 && !st.activeListings.some((l) => l.id === tx.id)) {
        st.activeListings.push({ ...tx });
      }
    }
  }

  st.totalSpent = totalSpent;
  st.totalEarned = totalEarned;
  st.activeListingValue = activeListingValue;
  st.activeListingCost = activeListingCost;
  st.categories = categories;

  return st;
}

function loadStats() {
  try {
    if (!fs.existsSync(CFG.statsFile)) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(fs.readFileSync(CFG.statsFile, 'utf8'));
    const merged = { ...DEFAULT_STATS, ...parsed };
    return sanitizeAndSyncStats(merged);
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

  if (last && now - last.time < 10000 && last.balance === bal && last.spent === state.STATS.totalSpent && last.earned === state.STATS.totalEarned) {
    return;
  }

  state.STATS.history.push({
    time: now,
    balance: bal !== null && bal !== undefined ? bal : 0,
    spent: state.STATS.totalSpent || 0,
    earned: state.STATS.totalEarned || 0,
    netProfit: (state.STATS.totalEarned || 0) - (state.STATS.totalSpent || 0),
    orders: state.STATS.ordersPlaced || 0,
  });

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

// /ah üzerine yeni bir ilan konulduğunda çağrılır (DOĞRUDAN GELİR DEĞİL, BEKLEYEN DEĞERDİR)
function recordListing({ category, item, amount, sellPrice, total, unitCost, totalCost, note }) {
  if (!state.STATS) return null;
  if (!Array.isArray(state.STATS.ledger)) state.STATS.ledger = [];
  if (!Array.isArray(state.STATS.activeListings)) state.STATS.activeListings = [];
  if (!state.STATS.categories) state.STATS.categories = {};

  const qty = Math.max(1, parseInt(amount, 10) || 1);
  const txTotal = total !== undefined ? Math.round(total) : Math.round(qty * (sellPrice || 0));
  const uPrice = sellPrice !== undefined ? Math.round(sellPrice) : (qty ? Math.round(txTotal / qty) : txTotal);
  const uCost = unitCost !== undefined ? Math.round(unitCost) : (totalCost !== undefined && qty ? Math.round(totalCost / qty) : 0);
  const tCost = totalCost !== undefined ? Math.round(totalCost) : Math.round(qty * uCost);

  const tx = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
    type: 'LISTING',
    category: category || 'İlan',
    item: item || 'Eşya',
    amount: qty,
    unitPrice: uPrice,
    total: txTotal,
    cost: tCost,
    profit: txTotal - tCost,
    note: note || `/ah üzerinde satışa sunuldu (Maliyet: $${tCost.toLocaleString()}, Beklenen Kâr: $${(txTotal - tCost).toLocaleString()})`,
  };

  state.STATS.ledger.unshift(tx);
  if (state.STATS.ledger.length > 300) {
    state.STATS.ledger = state.STATS.ledger.slice(0, 300);
  }

  state.STATS.activeListings.unshift({ ...tx });
  if (state.STATS.activeListings.length > 100) {
    state.STATS.activeListings = state.STATS.activeListings.slice(0, 100);
  }

  state.STATS.activeListingValue = (state.STATS.activeListingValue || 0) + txTotal;
  state.STATS.activeListingCost = (state.STATS.activeListingCost || 0) + tCost;

  const catKey = category || 'İlan';
  if (!state.STATS.categories[catKey]) {
    state.STATS.categories[catKey] = { spent: 0, earned: 0, listingValue: 0, count: 0 };
  }
  state.STATS.categories[catKey].listingValue = (state.STATS.categories[catKey].listingValue || 0) + txTotal;
  state.STATS.categories[catKey].count = (state.STATS.categories[catKey].count || 0) + qty;

  saveStats();
  emitStats();
  return tx;
}

// Chat veya bildirimle satışın gerçekleştiği kesinleştiğinde çağrılır (GERÇEKLEŞEN NAKİT GELİR & NET KÂR)
function recordSale({ item, amount, sellPrice, total, cost, category, note }) {
  if (!state.STATS) return null;
  if (!Array.isArray(state.STATS.ledger)) state.STATS.ledger = [];
  if (!Array.isArray(state.STATS.activeListings)) state.STATS.activeListings = [];
  if (!state.STATS.categories) state.STATS.categories = {};

  const qty = Math.max(1, parseInt(amount, 10) || 1);
  const txTotal = total !== undefined ? Math.round(total) : Math.round(qty * (sellPrice || 0));
  const uPrice = sellPrice !== undefined ? Math.round(sellPrice) : (qty ? Math.round(txTotal / qty) : txTotal);

  // Eşleşen aktif ilanı bul ve ilandaki değerden düş
  let matchedListing = null;
  const idx = state.STATS.activeListings.findIndex((l) => {
    if (!item) return true;
    const lItem = (l.item || '').toLowerCase();
    const sItem = (item || '').toLowerCase();
    return lItem.includes(sItem) || sItem.includes(lItem);
  });

  if (idx >= 0) {
    matchedListing = state.STATS.activeListings.splice(idx, 1)[0];
    state.STATS.activeListingValue = Math.max(0, (state.STATS.activeListingValue || 0) - (matchedListing.total || txTotal));
    state.STATS.activeListingCost = Math.max(0, (state.STATS.activeListingCost || 0) - (matchedListing.cost || 0));
  }

  // Maliyet hesaplaması
  let actualCost = cost !== undefined ? Math.round(cost) : (matchedListing ? matchedListing.cost : 0);
  if (!actualCost && item && item.toLowerCase().includes('helmet')) {
    const eco = calculateUnitEconomics();
    actualCost = eco.totalUnitCost * qty;
  }
  const netProfit = txTotal - actualCost;

  const catKey = category || (matchedListing ? matchedListing.category : 'Satış Geliri');
  const tx = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
    type: 'INCOME',
    category: catKey,
    item: item || (matchedListing ? matchedListing.item : 'God Helmet'),
    amount: qty,
    unitPrice: uPrice,
    total: txTotal,
    cost: actualCost,
    profit: netProfit,
    note: note || `Satış onaylandı (Maliyet: $${actualCost.toLocaleString()}, Net Kâr: $${netProfit.toLocaleString()})`,
  };

  state.STATS.ledger.unshift(tx);
  if (state.STATS.ledger.length > 300) {
    state.STATS.ledger = state.STATS.ledger.slice(0, 300);
  }

  state.STATS.totalEarned = (state.STATS.totalEarned || 0) + txTotal;

  if (!state.STATS.categories[catKey]) {
    state.STATS.categories[catKey] = { spent: 0, earned: 0, listingValue: 0, count: 0 };
  }
  state.STATS.categories[catKey].earned = (state.STATS.categories[catKey].earned || 0) + txTotal;
  state.STATS.categories[catKey].count = (state.STATS.categories[catKey].count || 0) + qty;

  recordHistoryPoint();
  saveStats();
  emitStats();
  return tx;
}

// İptal edilen / outbid olunan siparişlerde paranın hesaba döndüğünü işler
function recordRefund({ category, item, amount, unitPrice, total, note }) {
  if (!state.STATS) return null;
  const qty = Math.max(1, parseInt(amount, 10) || 1);
  const txTotal = total !== undefined ? Math.round(total) : Math.round(qty * (unitPrice || 0));

  state.STATS.totalSpent = Math.max(0, (state.STATS.totalSpent || 0) - txTotal);

  const catKey = category || 'Malzeme Alımı';
  if (state.STATS.categories && state.STATS.categories[catKey]) {
    state.STATS.categories[catKey].spent = Math.max(0, (state.STATS.categories[catKey].spent || 0) - txTotal);
  }

  const tx = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
    type: 'REFUND',
    category: catKey,
    item: item || 'İptal Sipariş',
    amount: qty,
    unitPrice: unitPrice || 0,
    total: txTotal,
    note: note || 'İptal edilen sipariş iadesi (Giderden düşüldü)',
  };

  state.STATS.ledger.unshift(tx);
  if (state.STATS.ledger.length > 300) {
    state.STATS.ledger = state.STATS.ledger.slice(0, 300);
  }

  recordHistoryPoint();
  saveStats();
  emitStats();
  return tx;
}

// Genel harcama ve alim kaydi
function recordTransaction({ type, category, item, amount, unitPrice, total, cost, note }) {
  if (type === 'LISTING') {
    return recordListing({ category, item, amount, sellPrice: unitPrice, total, unitCost: cost, totalCost: cost, note });
  }
  if (type === 'INCOME') {
    return recordSale({ item, amount, sellPrice: unitPrice, total, cost, category, note });
  }

  if (!state.STATS) return null;
  if (!Array.isArray(state.STATS.ledger)) state.STATS.ledger = [];
  if (!state.STATS.categories) state.STATS.categories = {};

  const qty = Math.max(1, parseInt(amount, 10) || 1);
  const txTotal = total !== undefined ? Math.round(total) : Math.round(qty * (unitPrice || 0));
  const uPrice = unitPrice !== undefined ? Math.round(unitPrice) : (qty ? Math.round(txTotal / qty) : txTotal);

  const catKey = category || 'Diger';
  const tx = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
    type: 'EXPENSE',
    category: catKey,
    item: item || 'Esya',
    amount: qty,
    unitPrice: uPrice,
    total: txTotal,
    cost: txTotal,
    note: note || '',
  };

  state.STATS.ledger.unshift(tx);
  if (state.STATS.ledger.length > 300) {
    state.STATS.ledger = state.STATS.ledger.slice(0, 300);
  }

  if (!state.STATS.categories[catKey]) {
    state.STATS.categories[catKey] = { spent: 0, earned: 0, listingValue: 0, count: 0 };
  }

  state.STATS.totalSpent = (state.STATS.totalSpent || 0) + txTotal;
  state.STATS.categories[catKey].spent = (state.STATS.categories[catKey].spent || 0) + txTotal;
  state.STATS.categories[catKey].count = (state.STATS.categories[catKey].count || 0) + qty;

  recordHistoryPoint();
  saveStats();
  emitStats();
  return tx;
}

function resetStats() {
  state.STATS = {
    ...DEFAULT_STATS,
    startedAt: Date.now(),
    history: [],
    itemsCollected: {},
    categories: {},
    activeListings: [],
    ledger: [],
  };
  saveStats();
  emitStats();
  log('📊 İstatistikler ve muhasebe defteri sıfırlandı.');
  return state.STATS;
}

state.STATS = loadStats();

module.exports = {
  DEFAULT_STATS,
  calculateUnitEconomics,
  loadStats,
  saveStats,
  emitStats,
  bumpStats,
  recordListing,
  recordSale,
  recordRefund,
  recordTransaction,
  resetStats,
  recordHistoryPoint,
  recordItemCollected,
};
