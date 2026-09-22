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
};

module.exports = state;
