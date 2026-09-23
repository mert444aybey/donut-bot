'use strict';

// Tum modullerin paylastigi degisken durum. Baska hicbir modul bunu bozmaz,
// herkes state.xxx uzerinden okur/yazar (const ile kopyalanmaz, cunku degerler degisir).
const state = {
  S: null,            // panelden degisen ayarlar (settings.js yukler)
  STATS: null,        // istatistikler (stats.js yukler)

  bot: null,          // mineflayer bot
  io: null,           // socket.io sunucusu (web/server.js atar)
  ChatMessage: null,  // prismarine-chat (bot spawn olunca atanir)

  running: false,
  cancelToken: 0,

  orderComplete: false,
  completedOrders: {},
  spamSeen: false,
  listedSeen: false,
  lastSignPacket: null,

  // Satis takibi
  salesTracking: false,
  soldCount: 0,
  lastSellPrice: null,

  // Otomatik yeniden baslatma
  manualStop: false,
  autoRestartTimer: null,
  lastActiveMode: 'god_helmet',

  reconnecting: false,

  // Bakiye takibi
  balance: null,
  lastBalanceCheck: 0,

  // Portfoy takibi
  activeItemIndex: 0,

  // Anti-AFK
  antiAfkTimer: null,

  // Bot baglanti durumu
  botConnected: false,

  setRunning(v) {
    state.running = v;
    if (state.io) state.io.emit('status', v);
  },

  setBotConnected(v) {
    state.botConnected = v;
    if (state.io) state.io.emit('botStatus', v);
  },

  setBalance(b) {
    state.balance = b;
    if (state.io) state.io.emit('balance', b);
    try {
      const { recordHistoryPoint } = require('./stats');
      recordHistoryPoint(b);
    } catch (_) {}
  },

  // Aktif item ayarlarini dondurur (portfoy devredeyse secili portfoy elemanini, degilse tekil ayarlari)
  getActiveItem() {
    const S = state.S || {};
    if (S.portfolioEnabled && Array.isArray(S.portfolio) && S.portfolio.length > 0) {
      const idx = (state.activeItemIndex || 0) % S.portfolio.length;
      const p = S.portfolio[idx];
      return {
        item: p.item || S.item,
        itemId: p.itemId || S.itemId,
        orderAmount: p.orderAmount !== undefined ? p.orderAmount : S.orderAmount,
        orderPrice: p.orderPrice !== undefined ? p.orderPrice : S.orderPrice,
        sellPrice: p.sellPrice !== undefined ? p.sellPrice : S.sellPrice,
        sellCount: p.sellCount !== undefined ? p.sellCount : S.sellCount,
        sellBatch: p.sellBatch !== undefined ? p.sellBatch : S.sellBatch,
        minSellPrice: p.minSellPrice !== undefined ? p.minSellPrice : S.minSellPrice,
        undercutAmount: p.undercutAmount !== undefined ? p.undercutAmount : S.undercutAmount,
      };
    }
    return {
      item: S.item,
      itemId: S.itemId,
      orderAmount: S.orderAmount,
      orderPrice: S.orderPrice,
      sellPrice: S.sellPrice,
      sellCount: S.sellCount,
      sellBatch: S.sellBatch,
      minSellPrice: S.minSellPrice,
      undercutAmount: S.undercutAmount,
    };
  },

  markOrderCompleted(itemName) {
    state.orderComplete = true;
    if (!itemName) return;
    const norm = String(itemName).toLowerCase().replace(/['"`_]/g, ' ').replace(/\s+s\b/g, '').replace(/s\b/g, '').trim();
    state.completedOrders[norm] = Date.now();
  },

  isOrderCompletedFor(itemCfg, sinceTime = 0) {
    if (!itemCfg) return state.orderComplete;
    const tokens = [];
    if (itemCfg.item) tokens.push(String(itemCfg.item).toLowerCase().replace(/['"`_]/g, ' ').replace(/\s+s\b/g, '').replace(/s\b/g, '').trim());
    if (itemCfg.itemId) tokens.push(String(itemCfg.itemId).toLowerCase().replace(/['"`_]/g, ' ').trim());
    if (itemCfg.name) tokens.push(String(itemCfg.name).toLowerCase().replace(/['"`_]/g, ' ').trim());

    if (tokens.some((t) => t.includes('anvil') || t.includes('ors') || t.includes('örs'))) tokens.push('anvil');
    if (tokens.some((t) => t.includes('bottle') || t.includes('xp') || t.includes('enchanting'))) tokens.push('bottle o enchanting', 'experience bottle');
    if (tokens.some((t) => t.includes('helmet') || t.includes('kask'))) tokens.push('diamond helmet', 'helmet');

    for (const [key, timestamp] of Object.entries(state.completedOrders)) {
      if (timestamp >= sinceTime) {
        if (tokens.some((t) => key.includes(t) || t.includes(key))) {
          return true;
        }
      }
    }
    return false;
  },

  resetOrderCompletion(itemCfg) {
    if (!itemCfg) {
      state.orderComplete = false;
      state.completedOrders = {};
      return;
    }
    const tokens = [];
    if (itemCfg.item) tokens.push(String(itemCfg.item).toLowerCase().replace(/['"`_]/g, ' ').trim());
    if (itemCfg.itemId) tokens.push(String(itemCfg.itemId).toLowerCase().replace(/['"`_]/g, ' ').trim());
    if (tokens.some((t) => t.includes('anvil'))) tokens.push('anvil');
    if (tokens.some((t) => t.includes('bottle') || t.includes('xp'))) tokens.push('bottle o enchanting', 'experience bottle');

    for (const key of Object.keys(state.completedOrders)) {
      if (tokens.some((t) => key.includes(t) || t.includes(key))) {
        delete state.completedOrders[key];
      }
    }
    state.orderComplete = false;
  },
};

module.exports = state;
