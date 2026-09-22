'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats } = require('../stats');
const { sleep, humanSleep } = require('../utils/text');
const { snapshotWindow } = require('../utils/inspect');
const {
  assertActive,
  waitForWindow,
  waitForSignEditor,
  submitSign,
  safeClick,
  closeWindowSafe,
} = require('../utils/windows');

// Siparis menusu adimlari (slot numaralari Donut SMP'de dogrulandi)
function buildSteps(orderPrice) {
  const itemCfg = state.getActiveItem ? state.getActiveItem() : state.S;
  return [
    { name: 'Siparis menusu',   type: 'CLICK', slot: 51, expectWindow: true },
    { name: 'Alt menu',         type: 'CLICK', slot: 3,  expectWindow: true },
    { name: 'Kategori',         type: 'CLICK', slot: 12, expectWindow: true },
    { name: 'Item arama',       type: 'SIGN',  slot: 50, text: itemCfg.item },
    { name: 'Done',             type: 'CLICK', slot: 0,  expectWindow: true },
    { name: 'Miktar',           type: 'SIGN',  slot: 13, text: String(itemCfg.orderAmount) },
    { name: 'Fiyat',            type: 'SIGN',  slot: 14, text: String(orderPrice) },
    { name: 'Siparis onayi',    type: 'CLICK', slot: 16, expectWindow: false },
  ];
}

// /order <itemId> panosunu acar
async function fetchOrderReferencePrice(token) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  const cmd = `${S.orderSearchCmd} ${itemCfg.itemId}`.trim();
  dlog(`Siparis referans fiyati sorgulaniyor: ${cmd}`);

  const winPromise = waitForWindow(CFG.marketWindowTimeoutMs);
  winPromise.catch(() => {});
  state.bot.chat(cmd);

  let win;
  try {
    win = await winPromise;
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
async function computeOrderPrice(token) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  if (!S.autoOrderPriceEnabled) return itemCfg.orderPrice;

  const highest = await fetchOrderReferencePrice(token);
  let price;
  if (highest === null) {
    log(`Siparis panosunda ilan bulunamadi, yedek fiyat kullaniliyor: ${itemCfg.orderPrice}`);
    price = itemCfg.orderPrice;
  } else {
    price = Math.round(highest + (itemCfg.orderMarkup !== undefined ? itemCfg.orderMarkup : S.orderMarkup));
    log(`Siparis panosu tarandi: en yuksek ${highest} -> siparis fiyati ${price} olarak belirlendi.`);
  }

  if (price < 1) price = 1;
  const maxPrice = itemCfg.maxOrderPrice !== undefined ? itemCfg.maxOrderPrice : S.maxOrderPrice;
  if (price > maxPrice) {
    log(`UYARI: hesaplanan siparis fiyati (${price}) tavani (${maxPrice}) asiyor, tavana cekiliyor.`);
    price = maxPrice;
  }
  return price;
}

// Aktif siparisi /orders menusunden iptal eder ve parayi iade alir
async function cancelActiveOrder(token) {
  const bot = state.bot;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : state.S;
  log(`Aktif siparis iptal ediliyor: ${itemCfg.item}...`);
  assertActive(token);
  closeWindowSafe();
  await humanSleep(500);

  bot.chat('/orders');
  await waitForWindow();
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

async function runOrderFlow(token) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  const bot = state.bot;
  state.orderComplete = false;
  const orderPrice = await computeOrderPrice(token);
  assertActive(token);

  const steps = buildSteps(orderPrice);
  log(`Siparis veriliyor: ${itemCfg.orderAmount}x ${itemCfg.item} @ ${orderPrice}`);

  bot.chat('/orders');
  await waitForWindow();

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

  log('Siparis verildi.');
  bumpStats({ ordersPlaced: 1, itemsOrdered: itemCfg.orderAmount, totalSpent: itemCfg.orderAmount * orderPrice });
  return orderPrice;
}

// Siparisin tamamlanmasini bekler. Outbid olursa veya sure asilirsa iptal edip bilgi dondurur.
async function waitForOrderComplete(token, placedPrice) {
  const S = state.S;
  const timeoutMs = Math.max(1, S.orderTimeoutMin || 10) * 60 * 1000;
  const checkIntervalMs = Math.max(10, S.outbidCheckIntervalSec || 60) * 1000;

  log(`Siparisin tamamlanmasi bekleniyor (maks ${S.orderTimeoutMin || 10} dk, outbid kontrolu: ${S.outbidCheckIntervalSec || 60} sn)...`);

  const start = Date.now();
  let lastOutbidCheck = Date.now();

  while (!state.orderComplete) {
    assertActive(token);
    const elapsed = Date.now() - start;

    // 1. Zaman asimi kontrolu
    if (elapsed > timeoutMs) {
      log(`⏱️ SURE DOLDU: Siparis ${S.orderTimeoutMin || 10} dakika icinde tamamlanmadi. Siparis iptal ediliyor...`);
      await cancelActiveOrder(token);
      return { completed: false, reason: 'timeout' };
    }

    // 2. Outbid (onumuze gecilme) kontrolu
    if (S.autoOutbidRelist && placedPrice && (Date.now() - lastOutbidCheck >= checkIntervalMs)) {
      lastOutbidCheck = Date.now();
      try {
        const highest = await fetchOrderReferencePrice(token);
        if (highest !== null && highest > placedPrice) {
          const diff = highest - placedPrice;
          log(`⚠️ ONUMUZE GECILDI! Biri $${highest.toLocaleString()} fiyatiyla ($${diff.toLocaleString()} daha yuksek) siparis verdi!`);
          log(`Eski siparis iptal edilip yeni fiyattan acilacak...`);
          await cancelActiveOrder(token);
          return { completed: false, reason: 'outbid', newHighest: highest };
        }
      } catch (err) {
        dlog(`Outbid kontrol hatasi: ${err.message}`);
      }
    }

    await sleep(500);
  }

  log('Siparis tamamlandi.');
  return { completed: true };
}

module.exports = {
  buildSteps,
  fetchOrderReferencePrice,
  computeOrderPrice,
  cancelActiveOrder,
  runOrderFlow,
  waitForOrderComplete,
};
