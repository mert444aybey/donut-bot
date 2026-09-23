'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { sleep, humanSleep, titleOf, filledSlots } = require('../utils/text');
const { matchesItemOrder } = require('../utils/inspect');
const {
  assertActive,
  waitForWindow,
  waitForSlot,
  safeClick,
  itemCount,
  closeWindowSafe,
  executeCommandWindow,
} = require('../utils/windows');

function isCollectableItem(it) {
  if (!it || !it.name) return false;
  // UI / dekorasyon slotlarini atla
  if (it.name.includes('glass') || it.name === 'barrier' || it.name === 'arrow' || it.name === 'bedrock') {
    return false;
  }
  return true;
}

function findItemSlots(win, itemCfg) {
  const exactSlots = [];
  const otherSlots = [];

  for (let i = 0; i < win.inventoryStart; i++) {
    const it = win.slots[i];
    if (!it || !isCollectableItem(it)) continue;

    if (itemCfg) {
      if (matchesItemOrder(itemCfg, it)) {
        exactSlots.push(i);
      } else {
        otherSlots.push(i);
      }
    } else {
      exactSlots.push(i);
    }
  }

  // Eger ozel bir item hedeflenmisse ASLA diger alakasiz esyalari alma!
  if (itemCfg) return exactSlots;
  return exactSlots.length > 0 ? exactSlots : otherSlots;
}

// /orders -> 51 (Your Orders) -> hedef esyanin siparis slotu -> 13 (Collect Items)
async function collectItems(token, itemOverride) {
  const S = state.S || {};
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  const bot = state.bot;
  const itemName = itemCfg.item || itemCfg.itemId || 'Item';

  log(`📦 Depodan teslimat toplama basliyor: ${itemName}...`);
  await humanSleep(600);
  assertActive(token);
  closeWindowSafe();
  await humanSleep(300);

  const countTarget = () =>
    bot.inventory.items().filter((i) => matchesItemOrder(itemCfg, i)).reduce((s, i) => s + i.count, 0);

  const before = countTarget();
  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);

  // 1. Slot 51'e tikla ("Your Orders" menusunu ac)
  const yourOrdersPromise = waitForWindow();
  yourOrdersPromise.catch(() => {});
  await safeClick(51);
  let yourOrdersWin;
  try {
    yourOrdersWin = await yourOrdersPromise;
  } catch (e) {
    log(`"Your Orders" penceresi acilamadi (${e.message}).`);
    closeWindowSafe();
    return;
  }
  await humanSleep(400);
  assertActive(token);

  // 2. "Your Orders" menusu icinde hedeflenen esyanin siparis slotunu dinamik bul
  let orderSlot = -1;
  for (let s = 0; s < yourOrdersWin.inventoryStart; s++) {
    const it = yourOrdersWin.slots[s];
    if (!it || !isCollectableItem(it)) continue;
    if (matchesItemOrder(itemCfg, it)) {
      orderSlot = s;
      break;
    }
  }

  if (orderSlot === -1) {
    if (itemOverride) {
      log(`⚠️ Depoda "${itemName}" siparişi bulunamadı (henüz teslimat sandığı oluşmamış olabilir).`);
      closeWindowSafe();
      return;
    }
    // Klasik tekli mod fallback
    for (let s = 0; s < yourOrdersWin.inventoryStart; s++) {
      const it = yourOrdersWin.slots[s];
      if (it && isCollectableItem(it)) {
        orderSlot = s;
        break;
      }
    }
    if (orderSlot === -1) {
      log('Depoda teslim edilecek sipariş bulunamadı.');
      closeWindowSafe();
      return;
    }
  }

  log(`📦 Depoda "${itemName}" siparişi bulundu (Slot ${orderSlot}). Teslimat sandığı açılıyor...`);

  // 3. Siparis slotuna tikla ("Edit Order" acilir)
  const editWinPromise = waitForWindow();
  editWinPromise.catch(() => {});
  await safeClick(orderSlot);
  try {
    await editWinPromise;
  } catch (e) {
    log(`"Edit Order" penceresi acilamadi (${e.message}).`);
    closeWindowSafe();
    return;
  }
  await humanSleep(400);
  assertActive(token);

  // 4. Slot 13'e tikla ("Collect Items" sandigi acilir)
  const collectWinPromise = waitForWindow();
  collectWinPromise.catch(() => {});
  await safeClick(13);
  let collectWin;
  try {
    collectWin = await collectWinPromise;
  } catch (e) {
    log(`"Collect Items" penceresi acilamadi (${e.message}).`);
    closeWindowSafe();
    return;
  }
  await humanSleep(400);
  assertActive(token);

  dlog(`Toplama penceresi: "${titleOf(collectWin)}" | ${filledSlots(collectWin)}`);

  let initialSlots = findItemSlots(collectWin, itemCfg);
  if (initialSlots.length === 0) {
    log(`Toplama penceresinde hazir ${itemName} bulunamadi.`);
    closeWindowSafe();
    await humanSleep(400);
    return;
  }

  for (let round = 1; round <= CFG.collectMaxRounds; round++) {
    assertActive(token);
    const win = bot.currentWindow;
    if (!win) break;

    const slots = findItemSlots(win, itemCfg);
    if (slots.length === 0) break;
    dlog(`Toplama turu ${round}: slotlar ${slots.join(', ')}`);

    for (const slot of slots) {
      assertActive(token);
      if (!bot.currentWindow || !bot.currentWindow.slots[slot]) continue;
      if (bot.inventory.emptySlotCount() === 0) {
        log('⚠️ Envanter tamamen dolu, toplama durduruldu.');
        break;
      }

      await humanSleep(S.clickDelayMs || 400);
      await bot.clickWindow(slot, 0, 1); // shift-click
      await humanSleep(CFG.shiftWaitMs || 600);
    }
  }

  const leftover = bot.currentWindow ? findItemSlots(bot.currentWindow, itemCfg) : [];
  if (leftover.length > 0) {
    log(`UYARI: Teslimat penceresinde hala ${itemName} var (slotlar: ${leftover.join(', ')}). Envanter dolmus olabilir.`);
  }

  await humanSleep(300);
  closeWindowSafe();
  await humanSleep(400);

  const total = countTarget();
  const collected = total - before;
  if (collected > 0) {
    log(`✅ Teslimat tamamlandı: +${collected} adet ${itemName} (envanterde toplam: ${total})`);
    try {
      const { recordItemCollected } = require('../stats');
      recordItemCollected(itemCfg.itemId || itemName, collected);
    } catch (_) {}
  } else {
    log(`Teslimat sandığı kapatıldı (envanterdeki ${itemName}: ${total}).`);
  }
}

module.exports = { findItemSlots, collectItems };
