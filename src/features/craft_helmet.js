'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats, recordTransaction } = require('../stats');
const { sleep, humanSleep, titleOf } = require('../utils/text');
const { loreOf, snapshotWindow } = require('../utils/inspect');
const { assertActive, waitForWindow, closeWindowSafe, executeCommandWindow, safeClick, waitForSlot } = require('../utils/windows');
const { ensureExperienceLevel, combineInAnvil } = require('./anvil');
const { runOrderFlow, waitForOrderComplete } = require('./order');
const { collectItems } = require('./collect');

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

// /orders -> 51 (Your Orders) menusundeki 0'dan 6'ya kadar olan aktif siparisleri kontrol eder
async function inspectActiveOrders(token) {
  const bot = state.bot;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);
  assertActive(token);

  const nextWin = waitForWindow();
  nextWin.catch(() => {});
  await safeClick(51);
  const win = await nextWin;
  assertActive(token);

  await humanSleep(500);
  const activeOrders = {
    helmet: false,
    blast: false,
    resp: false,
    mending: false,
    unb: false,
    aqua: false,
    xp: false,
    count: 0,
  };

  // 0'dan 6'ya kadar olan slotlari tara
  for (let s = 0; s <= 6; s++) {
    const it = win.slots[s];
    if (!it || it.name.includes('glass') || it.name === 'barrier') continue;

    const name = (it.displayName || it.name || '').toLowerCase();
    const lore = (loreOf(it) || []).join(' ').toLowerCase();
    const all = `${name} ${lore}`;

    activeOrders.count++;
    if (all.includes('diamond_helmet') || all.includes('diamond helmet')) activeOrders.helmet = true;
    if (all.includes('blast protection') || all.includes('blast_prot')) activeOrders.blast = true;
    if (all.includes('respiration') || all.includes('resp_')) activeOrders.resp = true;
    if (all.includes('mending')) activeOrders.mending = true;
    if (all.includes('unbreaking')) activeOrders.unb = true;
    if (all.includes('aqua affinity') || all.includes('aqua_affinity')) activeOrders.aqua = true;
    if (all.includes('experience') || all.includes('enchanting')) activeOrders.xp = true;
  }

  const activeNames = [
    activeOrders.helmet ? 'Diamond Helmet' : null,
    activeOrders.blast ? 'Blast Prot 4' : null,
    activeOrders.resp ? 'Respiration 3' : null,
    activeOrders.mending ? 'Mending' : null,
    activeOrders.unb ? 'Unbreaking 3' : null,
    activeOrders.aqua ? 'Aqua Affinity' : null,
    activeOrders.xp ? 'Bottle o\' Enchanting' : null,
  ].filter(Boolean);

  log(`📋 Panodaki aktif siparisler tarandi (Slot 0-6): ${activeNames.length > 0 ? activeNames.join(', ') : 'Aktif siparis yok'}`);

  closeWindowSafe();
  await humanSleep(400);
  return activeOrders;
}

// /orders -> 51 -> 0 -> 13 (Collect Items)
// Envanterde olan malzemeleri ASLA tekrar almaz, sadece 1 God Helmet icin eksik olanlari ceker!
async function collectHelmetMaterials(token) {
  const bot = state.bot;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  // Envanter durumunu tara: Hangileri eksik?
  const items = bot.inventory.items();
  let needHelmet = !items.some(isCleanHelmet) && !items.some(isStep1Helmet) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  let needBlast = !items.some(isBlastProt4Book) && !items.some(isStep1Helmet) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  let needResp = !items.some(isResp3Book) && !items.some(isStep2Book) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  let needMending = !items.some(isMendingBook) && !items.some(isStep2Book) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  let needUnb = !items.some(isUnbreaking3Book) && !items.some(isStep4Book) && !items.some(isGodHelmet);
  let needAqua = !items.some(isAquaAffinityBook) && !items.some(isStep4Book) && !items.some(isGodHelmet);
  const xpCount = items.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
  let needXP = xpCount < 30 && bot.experience.level < 10;

  const neededList = [];
  if (needHelmet) neededList.push('Diamond Helmet');
  if (needBlast) neededList.push('Blast Protection 4');
  if (needResp) neededList.push('Respiration 3');
  if (needMending) neededList.push('Mending');
  if (needUnb) neededList.push('Unbreaking 3');
  if (needAqua) neededList.push('Aqua Affinity');
  if (needXP) neededList.push('XP Şişesi');

  if (neededList.length === 0) {
    dlog('God Helmet icin gereken tum malzemeler zaten envanterde, sandiga girilmedi.');
    return;
  }

  dlog(`Toplama sandigindan sadece eksikler alinacak: ${neededList.join(', ')}`);

  // Adim 1: /orders ac
  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);

  // Adim 2: Slot 51 (Your Orders) tikla
  const yourOrdersPromise = waitForWindow();
  yourOrdersPromise.catch(() => {});
  await safeClick(51);
  const yourOrdersWin = await yourOrdersPromise;
  await humanSleep(350);

  // Slot 0 kontrolu: Eger bos/cam ise siparis yok demektir, tiklama!
  const firstSlot = yourOrdersWin.slots[0];
  if (!firstSlot || firstSlot.name.includes('glass') || firstSlot.name === 'barrier') {
    dlog('Your Orders ekraninda aktif siparis slotu bulunamadi (bos veya cam).');
    closeWindowSafe();
    await humanSleep(300);
    return;
  }

  // Adim 3: Ilk siparis slotuna tikla (siparis detay penceresi acilir)
  const detailsPromise = waitForWindow();
  detailsPromise.catch(() => {});
  await safeClick(0);
  const detailsWin = await detailsPromise;
  await humanSleep(350);

  // Adim 4: Slot 13'e tikla (Collect Items sandigi acilir)
  const collectPromise = waitForWindow();
  collectPromise.catch(() => {});
  await safeClick(13);
  const win = await collectPromise;
  await humanSleep(350);

  if (!win) {
    log('Toplama sandigi penceresi acilamadi.');
    closeWindowSafe();
    return;
  }

  for (let s = 0; s < win.inventoryStart; s++) {
    assertActive(token);
    const it = win.slots[s];
    if (!it) continue;

    // Kask: envanterde yoksa SADECE 1 adet al
    if (needHelmet && it.name === 'diamond_helmet' && isCleanHelmet(it)) {
      log(`📦 Sandıktan kask çekildi (slot ${s}).`);
      await humanSleep(state.S.clickDelayMs || 600);
      await bot.clickWindow(s, 0, 1);
      await humanSleep(CFG.shiftWaitMs || 1000);
      needHelmet = false; // Baska kask alma!
      continue;
    }

    // Büyü kitapları: envanterde yoksa SADECE 1'er adet al
    if (it.name === 'enchanted_book') {
      if (needBlast && isBlastProt4Book(it)) {
        log(`📦 Sandıktan Blast Protection 4 kitabı çekildi (slot ${s}).`);
        await humanSleep(state.S.clickDelayMs || 600);
        await bot.clickWindow(s, 0, 1);
        await humanSleep(CFG.shiftWaitMs || 1000);
        needBlast = false;
        continue;
      }
      if (needResp && isResp3Book(it)) {
        log(`📦 Sandıktan Respiration 3 kitabı çekildi (slot ${s}).`);
        await humanSleep(state.S.clickDelayMs || 600);
        await bot.clickWindow(s, 0, 1);
        await humanSleep(CFG.shiftWaitMs || 1000);
        needResp = false;
        continue;
      }
      if (needMending && isMendingBook(it)) {
        log(`📦 Sandıktan Mending kitabı çekildi (slot ${s}).`);
        await humanSleep(state.S.clickDelayMs || 600);
        await bot.clickWindow(s, 0, 1);
        await humanSleep(CFG.shiftWaitMs || 1000);
        needMending = false;
        continue;
      }
      if (needUnb && isUnbreaking3Book(it)) {
        log(`📦 Sandıktan Unbreaking 3 kitabı çekildi (slot ${s}).`);
        await humanSleep(state.S.clickDelayMs || 600);
        await bot.clickWindow(s, 0, 1);
        await humanSleep(CFG.shiftWaitMs || 1000);
        needUnb = false;
        continue;
      }
      if (needAqua && isAquaAffinityBook(it)) {
        log(`📦 Sandıktan Aqua Affinity kitabı çekildi (slot ${s}).`);
        await humanSleep(state.S.clickDelayMs || 600);
        await bot.clickWindow(s, 0, 1);
        await humanSleep(CFG.shiftWaitMs || 1000);
        needAqua = false;
        continue;
      }
    }

    // XP Şişesi: envanterde yetersizse al
    if (needXP && it.name === 'experience_bottle') {
      log(`📦 Sandıktan XP şişeleri çekildi (slot ${s}).`);
      await humanSleep(state.S.clickDelayMs || 600);
      await bot.clickWindow(s, 0, 1);
      await humanSleep(CFG.shiftWaitMs || 1000);
      needXP = false;
      continue;
    }
  }

  await humanSleep(400);
  closeWindowSafe();
  await humanSleep(400);
}

// Malzemeleri Kontrol Et, Eksikleri Sandiktan Cek, Yoksa Toplu Siparis Ver (Varsayilan 50x)
async function ensureAllMaterialsOrOrder(token) {
  const bot = state.bot;
  assertActive(token);
  const S = state.S || {};
  const batchAmount = S.godHelmetBatchOrderAmount || 50;

  // 1. Zaten envanterde 1 God Helmet seti hazir mi?
  let status = checkHelmetMaterials();
  if (status.ready) {
    dlog('God Helmet icin gereken tum malzemeler envanterde zaten mevcut.');
    return;
  }

  // 2. Panodaki aktif siparisleri tara (Slot 0-6)
  const activeOrders = await inspectActiveOrders(token);

  // Eger panoda zaten aktif siparis varsa, depodaki hazir teslimatlari cekmeyi dene
  if (activeOrders.count > 0) {
    log('📦 Panoda aktif siparisler var. Teslimat sandigi kontrol ediliyor...');
    await collectHelmetMaterials(token);
    status = checkHelmetMaterials();
    if (status.ready) {
      log('🎉 Envanterdeki malzemelerle God Helmet uretimi icin her sey hazir!');
      return;
    }
  }

  // 3. Hala eksikler varsa panoda olmayan malzemeler icin toplu siparis ac (50x)
  const toOrder = [];
  const items = bot.inventory.items();

  // Kask kontrolu: Envanterde yoksa VE panoda aktif siparisi de yoksa toplu siparis ac
  const hasHelmet = items.some(isCleanHelmet) || items.some(isStep1Helmet) || items.some(isStep3Helmet);
  if (!hasHelmet && !activeOrders.helmet) {
    toOrder.push({
      item: 'Diamond Helmet',
      itemId: 'diamond_helmet',
      signText: 'Diamond Helmet',
      selectSlot: 0,
      orderSearchQuery: 'diamond helmet',
      orderAmount: batchAmount,
      orderPrice: S.diamondHelmetOrderPrice || 12000,
      fixedPrice: true,
      category: 'Kask',
    });
  }

  // Blast Protection 4 kontrolu
  if (!items.some(isStep1Helmet) && !items.some(isStep3Helmet) && !items.some(isBlastProt4Book) && !activeOrders.blast) {
    toOrder.push({
      item: 'Enchanted Book Blast Protection 4',
      itemId: 'enchanted_book',
      signText: 'enchanted book',
      pageClicks: [53, 53],
      selectSlot: 7,
      orderSearchQuery: 'enchanted book blast protection 4',
      matchLore: 'blast protection',
      orderAmount: batchAmount,
      orderPrice: S.bookBlastOrderPrice || 15000,
      category: 'Kitap',
    });
  }

  // Respiration 3 & Mending kontrolu
  if (!items.some(isStep3Helmet) && !items.some(isStep2Book)) {
    if (!items.some(isResp3Book) && !activeOrders.resp) {
      toOrder.push({
        item: 'Enchanted Book Respiration 3',
        itemId: 'enchanted_book',
        signText: 'enchanted book',
        pageClicks: [53, 53],
        selectSlot: 13,
        orderSearchQuery: 'enchanted book respiration 3',
        matchLore: 'respiration',
        orderAmount: batchAmount,
        orderPrice: S.bookRespOrderPrice || 15000,
        category: 'Kitap',
      });
    }
    if (!items.some(isMendingBook) && !activeOrders.mending) {
      toOrder.push({
        item: 'Enchanted Book Mending',
        itemId: 'enchanted_book',
        signText: 'enchanted book',
        pageClicks: [53, 53],
        selectSlot: 8,
        orderSearchQuery: 'enchanted book mending',
        matchLore: 'mending',
        orderAmount: batchAmount,
        orderPrice: S.bookMendingOrderPrice || 25000,
        category: 'Kitap',
      });
    }
  }

  // Unbreaking 3 & Aqua Affinity kontrolu
  if (!items.some(isStep4Book)) {
    if (!items.some(isUnbreaking3Book) && !activeOrders.unb) {
      toOrder.push({
        item: 'Enchanted Book Unbreaking 3',
        itemId: 'enchanted_book',
        signText: 'enchanted book',
        pageClicks: [53, 53],
        selectSlot: 37,
        orderSearchQuery: 'enchanted book unbreaking 3',
        matchLore: 'unbreaking',
        orderAmount: batchAmount,
        orderPrice: S.bookUnbOrderPrice || 15000,
        category: 'Kitap',
      });
    }
    if (!items.some(isAquaAffinityBook) && !activeOrders.aqua) {
      toOrder.push({
        item: 'Enchanted Book Aqua Affinity',
        itemId: 'enchanted_book',
        signText: 'enchanted book',
        pageClicks: [53],
        selectSlot: 16,
        orderSearchQuery: 'enchanted book aqua affinity',
        matchLore: 'aqua affinity',
        orderAmount: batchAmount,
        orderPrice: S.bookAquaOrderPrice || 10000,
        category: 'Kitap',
      });
    }
  }

  // XP Siseleri kontrolu
  const xpCount = items.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
  if (xpCount < 30 && bot.experience.level < 10 && !activeOrders.xp) {
    const bottleQty = Math.max(64, S.xpBottleOrderAmount || 64);
    const bottlePrice = S.xpBottleOrderPrice || 250;
    toOrder.push({
      item: "Bottle o' Enchanting",
      itemId: 'experience_bottle',
      signText: "Bottle o' Enchanting",
      selectSlot: 0,
      orderSearchQuery: 'bottle o enchanting',
      orderAmount: bottleQty,
      orderPrice: bottlePrice,
      category: 'XP Şişesi',
    });
  }

  // Panoda siparisi olmayan eksik malzemeler icin toplu siparis ac
  if (toOrder.length > 0) {
    log(`🚀 TOPLU SIPARIS: Eksik ${toOrder.length} kalem malzeme icin ${batchAmount}'er adet siparis panoya veriliyor...`);
    for (const itemOrder of toOrder) {
      assertActive(token);
      log(`Siparis panoya veriliyor: ${itemOrder.orderAmount}x ${itemOrder.item}...`);

      try {
        const placedPrice = await runOrderFlow(token, itemOrder);
        recordTransaction({
          type: 'EXPENSE',
          category: itemOrder.category,
          item: itemOrder.item,
          amount: itemOrder.orderAmount,
          unitPrice: placedPrice,
          total: itemOrder.orderAmount * placedPrice,
          note: `God Helmet uretimi icin toplu (${itemOrder.orderAmount}x) /orders alimi`,
        });
        await humanSleep(2000);
      } catch (err) {
        log(`Bilgi: ${itemOrder.item} siparisi verilirken (${err.message}), diger malzemelere devam ediliyor.`);
        closeWindowSafe();
        await humanSleep(1500);
      }
    }
    log(`✅ Gerekli toplu siparisler panoya verildi!`);
  } else {
    log(`ℹ️ Tum eksik malzemelerin siparisleri panoda zaten aktif. Yeni siparis acilmiyor, teslimatlar bekleniyor.`);
  }

  // 4. Periyodik olarak (her 30 saniyede bir) depodan eksikleri topla ve tamamlanmasini bekle
  log('⏳ Siparis teslimatlari bekleniyor. Her 30 saniyede bir depo kontrol edilecek...');
  const timeoutMs = Math.max(1, S.orderTimeoutMin || 60) * 60 * 1000;
  const startWait = Date.now();

  while (true) {
    assertActive(token);

    await sleep(30000); // 30 saniye bekle
    assertActive(token);

    log('📦 30 sn doldu: Depo taranıyor, teslim edilen eksikler çekiliyor...');
    await collectHelmetMaterials(token);

    status = checkHelmetMaterials();
    if (status.ready) {
      log('🎉 God Helmet icin tum malzemeler eksiksiz tamamlandi! Ors ile birlestirmeye geciliyor...');
      break;
    } else {
      log(`⏳ Eksik malzemeler bekleniyor (${status.missing.length} kalem): ${status.missing.join(', ')}...`);
    }

    if (Date.now() - startWait > timeoutMs) {
      log(`⏱️ Toplu siparis bekleme suresi doldu. Son kontrol yapiliyor...`);
      await collectHelmetMaterials(token);
      status = checkHelmetMaterials();
      if (status.ready) break;
      throw new Error(`Siparis bekleme suresi doldu, eksikler var: ${status.missing.join(', ')}`);
    }
  }
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

  // Malzemeleri kontrol et, eksik olanlari /orders uzerinden siparis et ve topla
  await ensureAllMaterialsOrOrder(token);

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

function calculateGodHelmetCost() {
  const S = state.S || {};
  const helmetCost = S.diamondHelmetOrderPrice || S.diamondHelmetCost || 25000;
  const blastCost = S.bookBlastOrderPrice || S.bookBlastCost || 15000;
  const respCost = S.bookRespOrderPrice || S.bookRespCost || 15000;
  const mendingCost = S.bookMendingOrderPrice || S.bookMendingCost || 25000;
  const unbCost = S.bookUnbOrderPrice || S.bookUnbCost || 15000;
  const aquaCost = S.bookAquaOrderPrice || S.bookAquaCost || 10000;
  const bottlePrice = S.xpBottleOrderPrice || 250;
  const xpCost = bottlePrice * 60; // 5 adimda harcanan yaklasik sise maliyeti
  const anvilDepreciation = 5000;  // Ors payi

  return helmetCost + blastCost + respCost + mendingCost + unbCost + aquaCost + xpCost + anvilDepreciation;
}

function computeGodHelmetSellPrice(lowest) {
  const S = state.S || {};
  const fallback = S.godHelmetSellPrice || 250000;
  const minPriceSetting = S.godHelmetMinSellPrice || 120000;
  const undercut = S.godHelmetUndercut || 1000;
  const totalCost = calculateGodHelmetCost();
  const minProfitMargin = S.godHelmetMinProfit || 25000; // Asla zarara girmemek icin garanti kar
  const absoluteFloor = Math.max(minPriceSetting, totalCost + minProfitMargin);

  if (lowest === null || lowest === undefined) {
    return Math.max(fallback, absoluteFloor);
  }

  let price = lowest - undercut;
  if (price < absoluteFloor) {
    log(`🛡️ ZARAR ONLEME KORUMASI DEVREDE: Piyasadaki en ucuz God Helmet ($${lowest.toLocaleString()}) toplam maliyetimiz ($${totalCost.toLocaleString()}) ve kar hedefimizin altinda! Asla zarar etmemek icin taban fiyattan ($${absoluteFloor.toLocaleString()}) listeleniyor.`);
    price = absoluteFloor;
  }
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

  const totalCost = calculateGodHelmetCost();
  recordTransaction({
    type: 'INCOME',
    category: 'God Helmet Satışı',
    item: 'God Helmet (5 Büyülü)',
    amount: 1,
    unitPrice: sellPrice,
    total: sellPrice,
    note: `/ah üzerinde satışa konuldu (Tahmini kâr: $${(sellPrice - totalCost).toLocaleString()})`,
  });
}

module.exports = {
  getEnchants,
  isGodHelmet,
  checkHelmetMaterials,
  craftGodHelmet,
  calculateGodHelmetCost,
  fetchLowestGodHelmetPrice,
  computeGodHelmetSellPrice,
  sellGodHelmet,
};
