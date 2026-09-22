'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { sleep, humanSleep, titleOf, filledSlots } = require('../utils/text');
const {
  assertActive,
  waitForWindow,
  waitForSlot,
  safeClick,
  itemCount,
  closeWindowSafe,
} = require('../utils/windows');

function isCollectableItem(it) {
  if (!it || !it.name) return false;
  // UI / dekorasyon slotlarini atla
  if (it.name.includes('glass') || it.name === 'barrier' || it.name === 'arrow' || it.name === 'bedrock') {
    return false;
  }
  return true;
}

function findItemSlots(win) {
  const S = state.S || {};
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  const targetIds = new Set();
  if (itemCfg.itemId) targetIds.add(itemCfg.itemId);
  if (S.portfolioEnabled && Array.isArray(S.portfolio)) {
    S.portfolio.forEach(p => { if (p.itemId) targetIds.add(p.itemId); });
  }

  const exactSlots = [];
  const otherSlots = [];

  for (let i = 0; i < win.inventoryStart; i++) {
    const it = win.slots[i];
    if (!it) continue;
    if (targetIds.has(it.name)) {
      exactSlots.push(i);
    } else if (isCollectableItem(it)) {
      otherSlots.push(i);
    }
  }

  // Once hedef itemleri, yoksa collect penceresindeki toplanabilir diger itemleri al
  return exactSlots.length > 0 ? exactSlots : otherSlots;
}

// /orders -> 51 -> 0 -> 13 -> "Collect Items" penceresinde itemleri shift-click ile alir
async function collectItems(token) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  const bot = state.bot;
  log('Toplama basliyor...');
  await humanSleep(1200);
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  const before = itemCount();
  bot.chat('/orders');
  await waitForWindow();

  for (const step of CFG.COLLECT_PATH) {
    assertActive(token);
    const nextWin = step.expectWindow ? waitForWindow() : null;
    if (nextWin) nextWin.catch(() => {});
    await safeClick(step.slot);
    if (nextWin) await nextWin;
  }

  // Pencerenin yuklenmesi icin hafif bekle
  await waitForSlot(CFG.collectSlot, CFG.slotWaitMs);
  const win0 = bot.currentWindow;
  if (!win0) {
    log('Toplama penceresi acilamadi.');
    return;
  }
  dlog(`Toplama penceresi: "${titleOf(win0)}" | ${filledSlots(win0)}`);

  let initialSlots = findItemSlots(win0);
  if (initialSlots.length === 0) {
    log('Toplama penceresinde hazir item bulunamadi (henuz siparis teslim edilmemis olabilir).');
    closeWindowSafe();
    await humanSleep(400);
    return;
  }

  for (let round = 1; round <= CFG.collectMaxRounds; round++) {
    assertActive(token);
    const win = bot.currentWindow;
    if (!win) break;

    const slots = findItemSlots(win);
    if (slots.length === 0) break;
    dlog(`Toplama turu ${round}: slotlar ${slots.join(', ')}`);

    for (const slot of slots) {
      assertActive(token);
      if (!bot.currentWindow || !bot.currentWindow.slots[slot]) continue;

      const prev = itemCount(itemCfg.itemId);
      await humanSleep(S.clickDelayMs);
      await bot.clickWindow(slot, 0, 1);
      await humanSleep(CFG.shiftWaitMs);

      if (itemCount(itemCfg.itemId) <= prev && bot.currentWindow && bot.currentWindow.slots[slot]) {
        dlog(`Slot ${slot}: envanter artmadi, tekrar deneniyor`);
        await humanSleep(S.clickDelayMs);
        await bot.clickWindow(slot, 0, 1);
        await humanSleep(CFG.shiftWaitMs);
      }
    }
  }

  const leftover = bot.currentWindow ? findItemSlots(bot.currentWindow) : [];
  if (leftover.length > 0) log(`UYARI: pencerede hala item var (slotlar: ${leftover.join(', ')}). Envanter dolu olabilir.`);

  await humanSleep(400);
  closeWindowSafe();
  await humanSleep(400);

  const total = itemCount(itemCfg.itemId);
  const collected = total - before;
  if (collected > 0) {
    log(`Toplandi: +${collected} ${itemCfg.itemId} (envanterde toplam ${total})`);
    try {
      const { recordItemCollected } = require('../stats');
      recordItemCollected(itemCfg.itemId, collected);
    } catch (_) {}
  } else {
    log(`Toplama tamamlandi (envanterdeki ${itemCfg.itemId}: ${total}).`);
  }
}

module.exports = { findItemSlots, collectItems };
