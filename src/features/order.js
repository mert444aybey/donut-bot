'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats } = require('../stats');
const { sleep, humanSleep, titleOf } = require('../utils/text');
const { snapshotWindow, displayOf, loreOf } = require('../utils/inspect');
const {
  assertActive,
  waitForWindow,
  waitForSignEditor,
  submitSign,
  safeClick,
  closeWindowSafe,
  executeCommandWindow,
} = require('../utils/windows');

// Siparis menusu adimlari (slot numaralari Donut SMP'de dogrulandi)
function buildSteps(orderPrice, itemOverride) {
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : state.S);
  const signText = itemCfg.signText || itemCfg.item;
  const pageClicks = Array.isArray(itemCfg.pageClicks) ? itemCfg.pageClicks : [];
  const selectSlot = itemCfg.selectSlot !== undefined ? itemCfg.selectSlot : 0;

  const steps = [
    { name: 'Siparis menusu',   type: 'CLICK', slot: 51, expectWindow: true },
    { name: 'Alt menu',         type: 'CLICK', slot: 8,  expectWindow: true },
    { name: 'Kategori',         type: 'CLICK', slot: 12, expectWindow: true },
    { name: 'Item arama',       type: 'SIGN',  slot: 50, text: signText },
  ];

  for (let p = 0; p < pageClicks.length; p++) {
    steps.push({
      name: `Sayfa degistir (${p + 1}/${pageClicks.length})`,
      type: 'CLICK',
      slot: pageClicks[p],
      expectWindow: true,
    });
  }

  steps.push({
    name: 'Item secimi',
    type: 'CLICK',
    slot: selectSlot,
    expectWindow: true,
    isItemSelect: true,
  });

  steps.push(
    { name: 'Miktar',        type: 'SIGN',  slot: 13, text: String(itemCfg.orderAmount) },
    { name: 'Fiyat',         type: 'SIGN',  slot: 14, text: String(orderPrice) },
    { name: 'Siparis onayi', type: 'CLICK', slot: 16, expectWindow: false }
  );

  return steps;
}

// /order <itemId> veya /order enchanted book <büyü> panosunu acar
async function fetchOrderReferencePrice(token, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  assertActive(token);

  const query = itemCfg.orderSearchQuery || itemCfg.item || itemCfg.itemId;
  const cmd = `${S.orderSearchCmd} ${query}`.trim();
  dlog(`Siparis referans fiyati sorgulaniyor: ${cmd}`);

  let win;
  try {
    win = await executeCommandWindow(cmd, CFG.marketWindowTimeoutMs, 2);
  } catch (e) {
    log(`Siparis panosu penceresi acilmadi (${e.message}), yedek fiyat kullanilacak.`);
    return null;
  }
  assertActive(token);

  await humanSleep(CFG.marketReadDelayMs);
  const snap = snapshotWindow(state.bot.currentWindow || win);
  closeWindowSafe();
  await humanSleep(300);

  if (!snap) return null;

  dlog(`Siparis panosu penceresi: "${snap.title}" | ${snap.slots.filter(Boolean).length} dolu slot`);

  let highest = null;
  for (const it of snap.slots) {
    if (!it || it.name !== itemCfg.itemId) continue;
    for (const p of it.prices) {
      if (highest === null || p.value > highest) highest = p.value;
    }
  }

  if (highest === null) {
    dlog('Siparis panosunda bu iteme ait fiyatli kayit bulunamadi.');
  } else {
    dlog(`En yuksek mevcut siparis fiyati: ${highest}`);
  }
  return highest;
}

// Siparis panosundaki en yuksek fiyatin uzerine cikip siparis fiyatini belirler.
async function computeOrderPrice(token, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  if (!S.autoOrderPriceEnabled || itemCfg.fixedPrice) {
    if (itemCfg.fixedPrice) {
      log(`Sabit siparis fiyati devrede: ${itemCfg.item || itemCfg.itemId} icin kullanici fiyati $${Number(itemCfg.orderPrice).toLocaleString()} uygulaniyor.`);
    }
    return itemCfg.orderPrice;
  }

  const highest = await fetchOrderReferencePrice(token, itemOverride);
  let price;
  if (highest === null) {
    log(`Siparis panosunda ilan bulunamadi, yedek fiyat kullaniliyor: $${itemCfg.orderPrice}`);
    price = itemCfg.orderPrice;
  } else {
    const markup = itemCfg.orderMarkup !== undefined ? itemCfg.orderMarkup : (S.orderMarkup || 100);
    price = Math.round(highest + markup);
    log(`Siparis panosu tarandi: en yuksek $${highest.toLocaleString()} -> siparis fiyati $${price.toLocaleString()} olarak belirlendi.`);
  }

  if (price < 1) price = 1;
  const maxPrice = itemCfg.maxOrderPrice !== undefined ? itemCfg.maxOrderPrice : (S.maxOrderPrice || 1000000000000);
  if (price > maxPrice) {
    log(`UYARI: hesaplanan siparis fiyati ($${price.toLocaleString()}) tavani ($${maxPrice.toLocaleString()}) asiyor, tavana cekiliyor.`);
    price = maxPrice;
  }
  return price;
}

// Aktif siparisi /orders menusunden iptal eder ve parayi iade alir
async function cancelActiveOrder(token, itemOverride) {
  const bot = state.bot;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : state.S);
  log(`Aktif siparis iptal ediliyor: ${itemCfg.item}...`);
  assertActive(token);

  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);
  assertActive(token);

  // Slot 51: Your Orders menusu
  await safeClick(51);
  const win = await waitForWindow();
  assertActive(token);

  // Penceredeki ilk aktif siparis slotunu bul
  let orderSlot = null;
  for (let i = 0; i < win.inventoryStart; i++) {
    const it = win.slots[i];
    if (it && (it.name === itemCfg.itemId || !it.name.includes('glass'))) {
      orderSlot = i;
      break;
    }
  }

  if (orderSlot !== null) {
    dlog(`Siparis slotu bulundu (${orderSlot}), iptal icin tiklaniyor`);
    await humanSleep(300);
    const nextWin = waitForWindow(3000);
    nextWin.catch(() => {});
    await bot.clickWindow(orderSlot, 0, 0);

    let confirmWin = null;
    try { confirmWin = await nextWin; } catch (_) {}

    // Eger bir onay penceresi acildiysa
    if (confirmWin && bot.currentWindow) {
      const cur = bot.currentWindow;
      for (let s = 0; s < cur.inventoryStart; s++) {
        const btn = cur.slots[s];
        if (btn && /lime|green|red|barrier|dye/i.test(btn.name)) {
          dlog(`Onay butonuna tiklaniyor (slot ${s}: ${btn.name})`);
          await bot.clickWindow(s, 0, 0);
          await sleep(500);
          break;
        }
      }
    }
    log(`Aktif siparis iptal edildi, para iade alindi.`);
  } else {
    log(`Iptal edilecek aktif siparis bulunamadi (onceden tamamlanmis olabilir).`);
  }

  closeWindowSafe();
  await humanSleep(500);

  try {
    const { queryBalance } = require('../bot');
    queryBalance();
  } catch (_) {}
}

// Eger secilen item buyulenebiliyorsa acilan ekranda direk 52. slota basar
async function handlePickEnchantments(token, itemCfg) {
  const bot = state.bot;
  assertActive(token);
  const win = bot.currentWindow;
  if (!win) return;

  log(`✨ Büyülenebilir eşya ekranı algılandı ("${titleOf(win)}"). Doğrudan 52. slota basılıyor...`);
  await humanSleep(350);

  const nextWinPromise = waitForWindow(5000).catch(() => null);
  try {
    await safeClick(52);
  } catch (err) {
    log(`safeClick(52) uyarısı: ${err.message}, doğrudan clickWindow(52) gönderiliyor...`);
    await bot.clickWindow(52, 0, 0);
  }
  const nextWin = await nextWinPromise;
  await humanSleep(400);

  if (nextWin || bot.currentWindow) {
    log(`Büyü ekranı geçildi, sipariş penceresi açıldı: "${titleOf(bot.currentWindow || nextWin)}"`);
  }
}

async function runOrderFlow(token, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  const bot = state.bot;
  state.orderComplete = false;

  closeWindowSafe();
  await humanSleep(400);

  const orderPrice = await computeOrderPrice(token, itemOverride);
  assertActive(token);

  const steps = buildSteps(orderPrice, itemOverride);
  log(`Siparis veriliyor: ${itemCfg.orderAmount}x ${itemCfg.item} @ $${orderPrice}`);

  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    assertActive(token);
    dlog(`Adim ${i + 1}/${steps.length}: ${step.name}`);

    try {
      if (step.type === 'CLICK') {
        const nextWin = step.expectWindow ? waitForWindow() : null;
        if (nextWin) nextWin.catch(() => {});
        await safeClick(step.slot);
        if (nextWin) await nextWin;

        // Eger item secimi yapildiysa ve farkli bir ekran (büyü secim ekrani vb.) acildiysa:
        if (step.isItemSelect && bot.currentWindow) {
          const title = (titleOf(bot.currentWindow) || '').toLowerCase();
          if (title.includes('enchant') || (!title.includes('new order') && !title.includes('your orders'))) {
            await handlePickEnchantments(token, itemCfg);
          }
        }
      }

      if (step.type === 'SIGN') {
        const signPromise = waitForSignEditor();
        signPromise.catch(() => {});
        await safeClick(step.slot);

        const signPacket = await signPromise;
        dlog(`Tabelaya yaziliyor: ${step.text}`);
        await sleep(CFG.signTypeDelayMs);

        const reopen = waitForWindow(CFG.reopenWaitMs);
        reopen.catch(() => {});
        submitSign(signPacket, step.text);

        try {
          await reopen;
        } catch (_) {
          throw new Error('tabela gonderildi ama menu yeniden acilmadi');
        }
      }
    } catch (e) {
      if (e.message === 'iptal edildi') throw e;
      throw new Error(`[${step.name}] ${e.message}`);
    }
  }

  log(`Siparis verildi: ${itemCfg.orderAmount}x ${itemCfg.item} @ $${orderPrice}`);
  bumpStats({ ordersPlaced: 1, itemsOrdered: itemCfg.orderAmount, totalSpent: itemCfg.orderAmount * orderPrice });
  return orderPrice;
}

// Siparisin tamamlanmasini bekler. Outbid olursa veya sure asilirsa iptal edip bilgi dondurur.
async function waitForOrderComplete(token, placedPrice, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  const timeoutMs = Math.max(1, S.orderTimeoutMin || 10) * 60 * 1000;
  const checkIntervalMs = Math.max(10, S.outbidCheckIntervalSec || 60) * 1000;

  log(`Siparisin tamamlanmasi bekleniyor: ${itemCfg.orderAmount}x ${itemCfg.item} (maks ${S.orderTimeoutMin || 10} dk, outbid kontrolu: ${S.outbidCheckIntervalSec || 60} sn)...`);

  const start = Date.now();
  let lastOutbidCheck = Date.now();

  while (!state.orderComplete) {
    assertActive(token);
    const elapsed = Date.now() - start;

    // 1. Zaman asimi kontrolu
    if (elapsed > timeoutMs) {
      log(`⏱️ SURE DOLDU: Siparis ${S.orderTimeoutMin || 10} dakika icinde tamamlanmadi. Siparis iptal ediliyor...`);
      await cancelActiveOrder(token, itemOverride);
      return { completed: false, reason: 'timeout' };
    }

    // 2. Outbid (onumuze gecilme) kontrolu
    if (S.autoOutbidRelist && placedPrice && !itemCfg.fixedPrice && (Date.now() - lastOutbidCheck >= checkIntervalMs)) {
      lastOutbidCheck = Date.now();
      try {
        const highest = await fetchOrderReferencePrice(token, itemOverride);
        if (highest !== null && highest > placedPrice) {
          const diff = highest - placedPrice;
          log(`⚠️ ONUMUZE GECILDI! Biri $${highest.toLocaleString()} fiyatiyla ($${diff.toLocaleString()} daha yuksek) siparis verdi!`);
          log(`Eski siparis iptal edilip yeni fiyattan acilacak...`);
          await cancelActiveOrder(token, itemOverride);
          return { completed: false, reason: 'outbid', newHighest: highest };
        }
      } catch (err) {
        dlog(`Outbid kontrol hatasi: ${err.message}`);
      }
    }

    await sleep(500);
  }

  log(`Siparis tamamlandi: ${itemCfg.item}`);
  return { completed: true };
}

// Eski veya ozel cagrilari runOrderFlow'a yonlendir
async function runCustomOrderFlow(itemName, amount, price, token) {
  return await runOrderFlow(token, {
    item: itemName,
    itemId: itemName.toLowerCase().replace(/\s+/g, '_'),
    orderAmount: amount,
    orderPrice: price,
  });
}

module.exports = {
  buildSteps,
  fetchOrderReferencePrice,
  computeOrderPrice,
  cancelActiveOrder,
  runOrderFlow,
  runCustomOrderFlow,
  waitForOrderComplete,
};
