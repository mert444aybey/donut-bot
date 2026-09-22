'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats } = require('../stats');
const { sleep, humanSleep, titleOf } = require('../utils/text');
const { loreOf, snapshotWindow } = require('../utils/inspect');
const { assertActive, waitForWindow, closeWindowSafe } = require('../utils/windows');
const { ensureExperienceLevel, combineInAnvil } = require('./anvil');

// 1. Buyuleri Tanima
function getEnchants(item) {
  if (!item) return [];
  const lore = (loreOf(item) || []).join(' ').toLowerCase();
  const name = (item.displayName || item.name || '').toLowerCase();
  const allText = `${name} ${lore}`;

  const enchants = [];
  if (allText.includes('blast protection 4') || allText.includes('blast protection iv')) enchants.push('blast_prot_4');
  if (allText.includes('respiration 3') || allText.includes('respiration iii')) enchants.push('resp_3');
  if (allText.includes('mending')) enchants.push('mending');
  if (allText.includes('unbreaking 3') || allText.includes('unbreaking iii')) enchants.push('unbreaking_3');
  if (allText.includes('aqua affinity') || allText.includes('aqua affinity 1') || allText.includes('aqua affinity i')) enchants.push('aqua_affinity');

  return enchants;
}

const hasOnly = (enchants, targetList) => {
  if (enchants.length !== targetList.length) return false;
  return targetList.every((e) => enchants.includes(e));
};

const isCleanHelmet = (it) => it && it.name === 'diamond_helmet' && getEnchants(it).length === 0;
const isBlastProt4Book = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['blast_prot_4']);
const isResp3Book = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['resp_3']);
const isMendingBook = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['mending']);
const isUnbreaking3Book = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['unbreaking_3']);
const isAquaAffinityBook = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['aqua_affinity']);

// Ara ve Son Urunler
const isStep1Helmet = (it) => it && it.name === 'diamond_helmet' && hasOnly(getEnchants(it), ['blast_prot_4']);
const isStep2Book = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['resp_3', 'mending']);
const isStep3Helmet = (it) => it && it.name === 'diamond_helmet' && hasOnly(getEnchants(it), ['blast_prot_4', 'resp_3', 'mending']);
const isStep4Book = (it) => it && it.name === 'enchanted_book' && hasOnly(getEnchants(it), ['unbreaking_3', 'aqua_affinity']);
const isGodHelmet = (it) => it && it.name === 'diamond_helmet' && hasOnly(getEnchants(it), ['blast_prot_4', 'resp_3', 'mending', 'unbreaking_3', 'aqua_affinity']);

// Malzeme Kontrolu
function checkHelmetMaterials() {
  const bot = state.bot;
  if (!bot || !bot.inventory) return { ready: false, missing: ['Bot bagli degil'] };

  const items = bot.inventory.items();
  const missing = [];

  // Zaten hazir god helmet var mi?
  if (items.some(isGodHelmet)) {
    return { ready: true, missing: [], hasFinished: true };
  }

  // Final kaski veya ara urunler
  const hasHelmet = items.some(isCleanHelmet) || items.some(isStep1Helmet) || items.some(isStep3Helmet);
  if (!hasHelmet) missing.push('Diamond Helmet');

  if (!items.some(isStep1Helmet) && !items.some(isStep3Helmet)) {
    if (!items.some(isBlastProt4Book)) missing.push('Enchanted Book Blast Protection 4');
  }

  if (!items.some(isStep3Helmet)) {
    if (!items.some(isStep2Book)) {
      if (!items.some(isResp3Book)) missing.push('Enchanted Book Respiration 3');
      if (!items.some(isMendingBook)) missing.push('Enchanted Book Mending');
    }
  }

  if (!items.some(isStep4Book)) {
    if (!items.some(isUnbreaking3Book)) missing.push('Enchanted Book Unbreaking 3');
    if (!items.some(isAquaAffinityBook)) missing.push('Enchanted Book Aqua Affinity');
  }

  const xpCount = items.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
  if (xpCount < 30 && bot.experience.level < 10) {
    missing.push(`Yeterli Bottle o' Enchanting (En az 30-60 adet, sende: ${xpCount})`);
  }

  return {
    ready: missing.length === 0,
    missing,
    hasFinished: false,
  };
}

// 2. 5 Adimli Birlestirme Agaci
async function craftGodHelmet(token) {
  const bot = state.bot;
  assertActive(token);

  let godHelmet = bot.inventory.items().find(isGodHelmet);
  if (godHelmet) {
    log('Envanterde zaten tamamlanmis bir God Helmet mevcut! Satisa geciliyor...');
    return godHelmet;
  }

  const matStatus = checkHelmetMaterials();
  if (!matStatus.ready) {
    throw new Error(`Uretim icin eksik malzemeler var:\n  - ${matStatus.missing.join('\n  - ')}`);
  }

  log('===== God Helmet Birlestirme Sureci Basliyor =====');

  // Adim 1: Helmet + Book (Blast Protection 4) [8 lv]
  let s1Helmet = bot.inventory.items().find(isStep1Helmet);
  let s3Helmet = bot.inventory.items().find(isStep3Helmet);

  if (!s1Helmet && !s3Helmet) {
    log('--- Adim 1/5: Helmet + Blast Protection 4 (Gereken: 8 Lv) ---');
    await ensureExperienceLevel(8, token);
    await combineInAnvil(isCleanHelmet, isBlastProt4Book, token);
    s1Helmet = bot.inventory.items().find(isStep1Helmet);
    if (!s1Helmet) throw new Error('Adim 1 basarisiz oldu (Blast Prot 4 kask olusmadi)!');
  } else {
    dlog('Adim 1 (Blast Prot 4 kask) zaten hazir, atlandi.');
  }

  // Adim 2: Book (Respiration 3) + Book (Mending) [2 lv]
  let s2Book = bot.inventory.items().find(isStep2Book);
  if (!s2Book && !s3Helmet) {
    log('--- Adim 2/5: Respiration 3 + Mending (Gereken: 2 Lv) ---');
    await ensureExperienceLevel(2, token);
    await combineInAnvil(isResp3Book, isMendingBook, token);
    s2Book = bot.inventory.items().find(isStep2Book);
    if (!s2Book) throw new Error('Adim 2 basarisiz oldu (Resp 3 + Mending kitabi olusmadi)!');
  } else {
    dlog('Adim 2 (Resp 3 + Mending kitabi) veya Adim 3 kaski zaten hazir, atlandi.');
  }

  // Adim 3: Helmet (Blast Prot 4) + Book (Resp 3, Mending) [10 lv]
  if (!s3Helmet) {
    log('--- Adim 3/5: Helmet (Blast Prot 4) + Book (Resp 3, Mending) (Gereken: 10 Lv) ---');
    await ensureExperienceLevel(10, token);
    await combineInAnvil(isStep1Helmet, isStep2Book, token);
    s3Helmet = bot.inventory.items().find(isStep3Helmet);
    if (!s3Helmet) throw new Error('Adim 3 basarisiz oldu (3 buyulu kask olusmadi)!');
  } else {
    dlog('Adim 3 (3 buyulu kask) zaten hazir, atlandi.');
  }

  // Adim 4: Book (Unbreaking 3) + Book (Aqua Affinity) [2 lv]
  let s4Book = bot.inventory.items().find(isStep4Book);
  if (!s4Book) {
    log('--- Adim 4/5: Unbreaking 3 + Aqua Affinity (Gereken: 2 Lv) ---');
    await ensureExperienceLevel(2, token);
    await combineInAnvil(isUnbreaking3Book, isAquaAffinityBook, token);
    s4Book = bot.inventory.items().find(isStep4Book);
    if (!s4Book) throw new Error('Adim 4 basarisiz oldu (Unbreaking 3 + Aqua kitabi olusmadi)!');
  } else {
    dlog('Adim 4 (Unbreaking 3 + Aqua kitabi) zaten hazir, atlandi.');
  }

  // Adim 5: Final God Helmet [9 lv]
  log('--- Adim 5/5: Final Birlestirme ➔ GOD HELMET (Gereken: 9 Lv) ---');
  await ensureExperienceLevel(9, token);
  await combineInAnvil(isStep3Helmet, isStep4Book, token);

  godHelmet = bot.inventory.items().find(isGodHelmet);
  if (!godHelmet) throw new Error('Adim 5 basarisiz oldu (God Helmet olusmadi)!');

  log('🎉 GOD HELMET BASARIYLA URETILDI!');
  bumpStats({ godHelmetsCrafted: 1 });
  return godHelmet;
}

// 3. Piyasa Taramasi ve Satis
async function fetchLowestGodHelmetPrice(token) {
  const bot = state.bot;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  const cmd = '/ah diamond_helmet Blast Protection 4 Respiration 3 Mending Unbreaking 3 Aqua Affinity';
  dlog(`God Helmet piyasa fiyati sorgulaniyor: ${cmd}`);

  const winPromise = waitForWindow(CFG.marketWindowTimeoutMs);
  winPromise.catch(() => {});
  bot.chat(cmd);

  let win;
  try {
    win = await winPromise;
  } catch (e) {
    log(`Piyasa penceresi acilmadi (${e.message}), yedek fiyat kullanilacak.`);
    return null;
  }
  assertActive(token);

  await humanSleep(CFG.marketReadDelayMs);
  const snap = snapshotWindow(bot.currentWindow || win);
  closeWindowSafe();
  await humanSleep(300);

  if (!snap) return null;

  let lowest = null;
  for (const it of snap.slots) {
    if (!it || it.name !== 'diamond_helmet') continue;
    const text = ((it.lore || []).join(' ') + ' ' + (it.display || '')).toLowerCase();
    const isGod = text.includes('blast protection 4') &&
                  text.includes('respiration 3') &&
                  text.includes('mending') &&
                  text.includes('unbreaking 3') &&
                  text.includes('aqua affinity');
    if (!isGod) continue;

    for (const p of it.prices) {
      if (lowest === null || p.value < lowest) lowest = p.value;
    }
  }

  if (lowest !== null) {
    log(`Piyasadaki en ucuz God Helmet: $${lowest.toLocaleString()}`);
  } else {
    dlog('Piyasada eslesen God Helmet ilani bulunamadi.');
  }
  return lowest;
}

function computeGodHelmetSellPrice(lowest) {
  const S = state.S || {};
  const fallback = S.godHelmetSellPrice || 250000;
  const minPrice = S.godHelmetMinSellPrice || 100000;
  const undercut = S.godHelmetUndercut || 1000;

  if (lowest === null || lowest === undefined) {
    return fallback;
  }
  let price = lowest - undercut;
  if (price < minPrice) price = minPrice;
  return Math.round(price);
}

async function sellGodHelmet(token) {
  const bot = state.bot;
  assertActive(token);
  closeWindowSafe();

  const godHelmet = bot.inventory.items().find(isGodHelmet);
  if (!godHelmet) {
    throw new Error('Satilacak God Helmet envanterde bulunamadi!');
  }

  await bot.equip(godHelmet, 'hand');
  await humanSleep(CFG.holdSyncMs);

  const held = bot.heldItem;
  if (!held || held.name !== 'diamond_helmet') {
    throw new Error('God Helmet ele alinamadi!');
  }

  let sellPrice;
  const S = state.S || {};
  if (S.autoPriceEnabled) {
    const lowest = await fetchLowestGodHelmetPrice(token);
    sellPrice = computeGodHelmetSellPrice(lowest);
  } else {
    sellPrice = S.godHelmetSellPrice || 250000;
  }

  log(`God Helmet satışa sunuluyor: $${sellPrice.toLocaleString()}`);

  const winPromise = waitForWindow(CFG.confirmWaitMs);
  winPromise.catch(() => {});

  const cmd = `/ah sell ${sellPrice}`;
  bot.chat(cmd);

  let win = null;
  try { win = await winPromise; } catch (_) { win = null; }
  assertActive(token);

  if (win) {
    dlog(`AH Onay penceresi acildi: "${titleOf(win)}"`);
    await sleep(CFG.ahConfirmDelayMs);
    assertActive(token);

    const cur = bot.currentWindow || win;
    let btnSlot = CFG.ahConfirmSlot;
    if (!cur.slots[btnSlot] || !CFG.ahConfirmItemRegex.test(cur.slots[btnSlot].name)) {
      const green = cur.slots.findIndex((s, idx) => idx < cur.inventoryStart && s && CFG.ahConfirmItemRegex.test(s.name));
      if (green >= 0) btnSlot = green;
    }

    dlog(`Onay butonuna tiklaniyor: slot ${btnSlot}`);
    await bot.clickWindow(btnSlot, 0, 0);
    await sleep(1000);
    closeWindowSafe();
  }

  log(`God Helmet basariyla ilana koyuldu: $${sellPrice.toLocaleString()}`);
  bumpStats({ listingsCreated: 1, itemsListed: 1 });
}

module.exports = {
  getEnchants,
  isGodHelmet,
  checkHelmetMaterials,
  craftGodHelmet,
  fetchLowestGodHelmetPrice,
  computeGodHelmetSellPrice,
  sellGodHelmet,
};
