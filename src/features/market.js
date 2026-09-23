'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { sleep, humanSleep } = require('../utils/text');
const { snapshotWindow } = require('../utils/inspect');
const { assertActive, waitForWindow, closeWindowSafe } = require('../utils/windows');

// /ah <itemId> penceresini acar, gorunen ilanlar arasindan (itemId'ye
// uyan slotlardaki lore'dan $ fiyatlari parse edip) en dusuk fiyati dondurur.
// Bulamazsa null doner (cagiran taraf belirlenen fiyata dusmeli).
async function fetchLowestListingPrice(token) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  const cmd = `${S.ahSearchCmd} ${itemCfg.itemId}`.trim();
  dlog(`Piyasa fiyati sorgulaniyor: ${cmd}`);

  const winPromise = waitForWindow(CFG.marketWindowTimeoutMs);
  winPromise.catch(() => {});
  state.bot.chat(cmd);

  let win;
  try {
    win = await winPromise;
  } catch (e) {
    log(`Piyasa penceresi acilmadi (${e.message}), belirlenen satis fiyati kullanilacak.`);
    return null;
  }
  assertActive(token);

  await humanSleep(CFG.marketReadDelayMs);
  const snap = snapshotWindow(state.bot.currentWindow || win);
  closeWindowSafe();
  await humanSleep(300);

  if (!snap) return null;

  dlog(`Piyasa penceresi: "${snap.title}" | ${snap.slots.filter(Boolean).length} dolu slot`);

  let lowest = null;
  for (const it of snap.slots) {
    if (!it || it.name !== itemCfg.itemId) continue;
    for (const p of it.prices) {
      if (lowest === null || p.value < lowest) lowest = p.value;
    }
  }

  if (lowest === null) {
    dlog('Piyasada bu iteme ait fiyatli ilan bulunamadi.');
  } else {
    dlog(`En dusuk piyasa fiyati: ${lowest}`);
  }
  return lowest;
}

// Piyasadaki en dusuk fiyata gore satis fiyati hesaplar.
function computeSellPrice(lowest) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  let price;
  const undercut = itemCfg.undercutAmount !== undefined ? itemCfg.undercutAmount : S.undercutAmount;
  const minPrice = itemCfg.minSellPrice !== undefined ? itemCfg.minSellPrice : S.minSellPrice;

  if (lowest === null || lowest === undefined) {
    price = itemCfg.sellPrice;
  } else {
    price = lowest - undercut;
  }
  price = Math.round(price);
  if (price < minPrice) price = minPrice;
  if (price < 1) price = 1;
  return price;
}

module.exports = { fetchLowestListingPrice, computeSellPrice };
