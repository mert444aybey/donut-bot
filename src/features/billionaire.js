'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats } = require('../stats');
const { humanSleep, sleep } = require('../utils/text');
const { assertActive, closeWindowSafe } = require('../utils/windows');
const {
  craftGodHelmetOnly,
  collectHelmetMaterials,
  sellAllGodHelmets,
  preOrderNextBatch,
  checkHelmetMaterials,
  isGodHelmet,
  isCleanHelmet,
  isBlastProt4Book,
  isResp3Book,
  isMendingBook,
  isUnbreaking3Book,
  isAquaAffinityBook,
  isStep1Helmet,
  isStep2Book,
  isStep3Helmet,
  isStep4Book,
} = require('./craft_helmet');
const { runOrderFlow, waitForOrderComplete } = require('./order');
const { collectItems } = require('./collect');
const { sellAll } = require('./sell');

// Haftalık 1 Milyar Dolar ($1B) Hedefi için DonutSMP Yüksek Hacimli Flipping Kataloğu
const BILLIONAIRE_FLIP_CATALOG = [
  {
    item: 'TNT',
    itemId: 'tnt',
    signText: 'tnt',
    orderAmount: 64,
    orderPrice: 26000,
    sellPrice: 42000,
    sellCount: 64,
    sellBatch: 64,
    undercutAmount: 100,
    minSellPrice: 20000,
    category: 'PvP Mühimmat',
  },
  {
    item: 'Totem of Undying',
    itemId: 'totem_of_undying',
    signText: 'totem of undying',
    orderAmount: 4,
    orderPrice: 135000,
    sellPrice: 240000,
    sellCount: 4,
    sellBatch: 1,
    undercutAmount: 500,
    minSellPrice: 100000,
    category: 'PvP Eşyası',
  },
  {
    item: 'Enchanted Golden Apple',
    itemId: 'enchanted_golden_apple',
    signText: 'enchanted golden apple',
    orderAmount: 8,
    orderPrice: 90000,
    sellPrice: 165000,
    sellCount: 8,
    sellBatch: 1,
    undercutAmount: 500,
    minSellPrice: 75000,
    category: 'PvP Tüketim',
  },
  {
    item: 'Wither Skeleton Skull',
    itemId: 'wither_skeleton_skull',
    signText: 'wither skeleton skull',
    orderAmount: 6,
    orderPrice: 48000,
    sellPrice: 89000,
    sellCount: 6,
    sellBatch: 3,
    undercutAmount: 200,
    minSellPrice: 40000,
    category: 'Boss / Beacon',
  },
];

// Haftalık 1B Metrik Hesaplayıcı
function getBillionaireMetrics() {
  const stats = state.STATS || {};
  const earned = stats.totalEarned || 0;
  const spent = stats.totalSpent || 0;
  const netProfit = earned - spent;
  const weeklyTarget = (state.S && state.S.billionaireTargetWeekly) || 1000000000;

  const startedAt = stats.startedAt || Date.now();
  const elapsedHours = Math.max(0.1, (Date.now() - startedAt) / (1000 * 60 * 60));
  const hourlyRate = Math.round(earned / elapsedHours);
  const dailyRate = Math.round(hourlyRate * 24);
  const weeklyRate = Math.round(hourlyRate * 168);

  const progressPct = Math.min(100, Math.max(0, (earned / weeklyTarget) * 100));
  const remaining = Math.max(0, weeklyTarget - earned);
  const hoursRemaining = hourlyRate > 0 ? Math.ceil(remaining / hourlyRate) : 168;

  return {
    weeklyTarget,
    earned,
    spent,
    netProfit,
    progressPct: parseFloat(progressPct.toFixed(2)),
    hourlyRate,
    dailyRate,
    weeklyRate,
    hoursRemaining,
    daysRemaining: parseFloat((hoursRemaining / 24).toFixed(1)),
  };
}

/**
 * 🚀 HAFTALIK 1 MİLYAR DOLAR HİBRİT İMPARATORLUK DÖNGÜSÜ (Billionaire Loop)
 *
 * Sırayla çalışır:
 * 1. [Depo & Ön Sipariş]: God Helmet malzemelerini ön sipariş ver ve tamamlananları depodan topla.
 * 2. [Seri Kask Üretimi]: Envanterdeki tüm kask ve kitapları örste seri birleştir.
 * 3. [God Helmet Listeleme]: Üretilen hazır kaskları en ucuz pazar fiyatıyla /ah'a koy.
 * 4. [Hızlı PvP Flipping]: Kasklar satılırken boş durma! DonutSMP'nin en hızlı giden eşyalarını /orders'tan alıp /ah'ta erit.
 * 5. [Metrik Güncelleme]: Canlı web paneline 1B hedef ilerlemesini raporla.
 */
async function runBillionaireCycle(token, cycleNumber) {
  const bot = state.bot;
  assertActive(token);
  const metrics = getBillionaireMetrics();

  log(`═══════════════════════════════════════════════════════════════════════════`);
  log(`👑 [1B HEDEFİ] DÖNGÜ #${cycleNumber} BAŞLIYOR | İlerleme: %${metrics.progressPct} ($${metrics.earned.toLocaleString()} / $${metrics.weeklyTarget.toLocaleString()})`);
  log(`📈 Hız: $${metrics.hourlyRate.toLocaleString()}/saat | Günlük Tahmin: $${metrics.dailyRate.toLocaleString()}/gün`);
  log(`═══════════════════════════════════════════════════════════════════════════`);

  // 1. FAZ: Hazır God Helmet'lar varsa hemen satışa koy
  const readyHelmets = bot.inventory.items().filter(isGodHelmet);
  if (readyHelmets.length > 0) {
    log(`💎 [Sütun 1] Envanterde ${readyHelmets.length} adet hazır God Helmet bulundu. Satışa sunuluyor...`);
    await sellAllGodHelmets(token);
    await humanSleep(1000);
  }

  // 2. FAZ: Malzemeleri topla ve Seri Üretim Bandını (Assembly Line) çalıştır
  log(`📦 [Sütun 1] God Helmet depo toplama ve malzeme kontrolü yapılıyor...`);
  try {
    await collectHelmetMaterials(token);
  } catch (err) {
    dlog(`Depodan kask malzemesi toplama: ${err.message}`);
  }
  assertActive(token);

  // Envanterde birleştirilebilecek kask/kitap var mı?
  const invItems = bot.inventory.items();
  const hasCraftables =
    (invItems.some(isCleanHelmet) && invItems.some(isBlastProt4Book)) ||
    (invItems.some(isResp3Book) && invItems.some(isMendingBook)) ||
    (invItems.some(isUnbreaking3Book) && invItems.some(isAquaAffinityBook)) ||
    (invItems.some(isStep1Helmet) && invItems.some(isStep2Book)) ||
    (invItems.some(isStep3Helmet) && invItems.some(isStep4Book));

  if (hasCraftables) {
    log(`🔨 [Sütun 1] Seri Üretim Bandı: Envanterdeki malzemeler örste birleştiriliyor...`);
    await craftGodHelmetOnly(token);
    await humanSleep(1000);

    // Yeni üretilenleri sat
    const newHelmets = bot.inventory.items().filter(isGodHelmet);
    if (newHelmets.length > 0) {
      log(`💎 [Sütun 1] Üretilen ${newHelmets.length} adet yeni God Helmet /ah pazarına koyuluyor...`);
      await sellAllGodHelmets(token);
      await humanSleep(1000);
    }
  }

  // Sıradaki 50'lik God Helmet partisi için eksik siparişleri aç (Pipelining)
  try {
    await preOrderNextBatch(token);
  } catch (err) {
    dlog(`Ön sipariş açma: ${err.message}`);
  }
  assertActive(token);

  // 3. FAZ: HIZLI PvP FLIPPING (Boşta Kalmama & Yüksek Nakit Akışı)
  // DonutSMP'de saniyede tükenen PvP sarf malzemelerinden sıradaki ürünü flip et
  const flipIndex = (cycleNumber - 1) % BILLIONAIRE_FLIP_CATALOG.length;
  const flipTemplate = BILLIONAIRE_FLIP_CATALOG[flipIndex];

  // Bakiye kontrolü ve dinamik bütçe ölçekleme
  const estimatedUnitPrice = flipTemplate.orderPrice || 25000;
  let targetOrderQty = flipTemplate.orderAmount || 64;

  if (state.balance !== null) {
    const totalCost = targetOrderQty * estimatedUnitPrice;
    if (state.balance < totalCost) {
      const affordableQty = Math.floor(state.balance / estimatedUnitPrice);
      if (affordableQty < 5) {
        log(`ℹ️ [Flipping] Mevcut bakiye ($${state.balance.toLocaleString()}) ${flipTemplate.item} için yetersiz, kask üretim ve satışına odaklanılıyor.`);
        bumpStats({ cyclesCompleted: 1 });
        const updatedMetrics = getBillionaireMetrics();
        state.io.emit('billionaire:update', updatedMetrics);
        await humanSleep(CFG.cycleDelayMs || 3000);
        return;
      }
      targetOrderQty = affordableQty;
      log(`ℹ️ [Flipping] Bakiye nedeniyle ${flipTemplate.item} miktarı ${targetOrderQty} adede ayarlandı.`);
    }
  }

  const flipItem = { ...flipTemplate, orderAmount: targetOrderQty };

  log(`⚡ [Sütun 2] Hızlı PvP Flipping Başlıyor: ${flipItem.orderAmount}x ${flipItem.item} (${flipIndex + 1}/${BILLIONAIRE_FLIP_CATALOG.length})...`);
  try {
    // 3a. /orders üzerinden piyasa altı fiyattan buy order ver
    const buyPrice = await runOrderFlow(token, flipItem);
    assertActive(token);

    // 3b. Siparişin dolmasını bekle (outbid olursa hemen güncelle)
    let orderStatus = await waitForOrderComplete(token, buyPrice, flipItem);
    assertActive(token);

    let outbidTries = 0;
    while (!orderStatus.completed && orderStatus.reason === 'outbid' && outbidTries < 2) {
      outbidTries++;
      log(`⚡ [Sütun 3] Outbid yakalandı! ${flipItem.item} siparişi yenileniyor (${outbidTries}/2)...`);
      await humanSleep(1200);
      const newPrice = await runOrderFlow(token, flipItem);
      orderStatus = await waitForOrderComplete(token, newPrice, flipItem);
    }

    if (orderStatus && orderStatus.completed) {
      // 3c. Satın alınan eşyaları depodan çek
      await collectItems(token, flipItem);
      await humanSleep(1000);
      assertActive(token);

      // 3d. /ah üzerinde piyasa fiyatından hemen satışa sun
      state.activeItemIndex = flipIndex;
      const previousActiveGetter = state.getActiveItem;
      state.getActiveItem = () => flipItem;
      try {
        await sellAll(token);
      } finally {
        state.getActiveItem = previousActiveGetter;
      }
      log(`✅ [Sütun 2] ${flipItem.item} satışı tamamlandı, nakit kasaya girdi!`);
    } else {
      log(`ℹ️ [Flipping] ${flipItem.item} siparişi tamamlanamadı (${orderStatus ? orderStatus.reason : 'bilinmiyor'}), sonraki döngüye geçiliyor.`);
    }
  } catch (err) {
    log(`Bilgi [Flipping]: ${flipItem.item} işleminde (${err.message}), döngüye devam ediliyor.`);
    closeWindowSafe();
  }

  bumpStats({ cyclesCompleted: 1 });
  const updatedMetrics = getBillionaireMetrics();
  state.io.emit('billionaire:update', updatedMetrics);

  log(`🎉 Döngü #${cycleNumber} tamamlandı! Toplam Ciro: $${updatedMetrics.earned.toLocaleString()} (Hedef: $${updatedMetrics.weeklyTarget.toLocaleString()})`);
  await humanSleep(CFG.cycleDelayMs || 3000);
}

module.exports = {
  BILLIONAIRE_FLIP_CATALOG,
  getBillionaireMetrics,
  runBillionaireCycle,
};
