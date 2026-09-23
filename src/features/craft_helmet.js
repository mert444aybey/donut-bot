'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats, recordTransaction } = require('../stats');
const { sleep, humanSleep, titleOf } = require('../utils/text');
const { loreOf, displayOf, snapshotWindow, extractItemEnchantments } = require('../utils/inspect');
const { assertActive, waitForWindow, closeWindowSafe, executeCommandWindow, safeClick, waitForSlot } = require('../utils/windows');
const { ensureExperienceLevel, combineInAnvil } = require('./anvil');
const { runOrderFlow, waitForOrderComplete } = require('./order');
const { collectItems } = require('./collect');

// 1. Buyuleri Tanima (1.21 Component, NBT, prismarine-item ve Lore destekli)
function getEnchants(item) {
  if (!item) return [];
  const enchants = [];

  // 1. 1.20.5+ / 1.21 Component, NBT ve prismarine-item uzerinden kesin tespit
  try {
    const rawList = extractItemEnchantments(item);
    for (const e of rawList) {
      if (e.name === 'blast_protection' && Number(e.lvl) >= 4 && !enchants.includes('blast_prot_4')) enchants.push('blast_prot_4');
      if (e.name === 'respiration' && Number(e.lvl) >= 3 && !enchants.includes('resp_3')) enchants.push('resp_3');
      if (e.name === 'mending' && !enchants.includes('mending')) enchants.push('mending');
      if (e.name === 'unbreaking' && Number(e.lvl) >= 3 && !enchants.includes('unbreaking_3')) enchants.push('unbreaking_3');
      if (e.name === 'aqua_affinity' && !enchants.includes('aqua_affinity')) enchants.push('aqua_affinity');
    }
  } catch (_) {}

  // 2. Metin analizi yedegi (satir bazli kesin regex ile)
  const lines = [item.displayName, item.name, ...(loreOf(item) || [])].filter(Boolean);

  if (!enchants.includes('blast_prot_4') && lines.some((l) => /\bblast\s+prot(?:ection)?\s+(?:iv|4)\b/i.test(l))) {
    enchants.push('blast_prot_4');
  }
  if (!enchants.includes('resp_3') && lines.some((l) => /\brespiration\s+(?:iii|3)\b/i.test(l))) {
    enchants.push('resp_3');
  }
  if (!enchants.includes('mending') && lines.some((l) => /\bmending\b/i.test(l))) {
    enchants.push('mending');
  }
  if (!enchants.includes('unbreaking_3') && lines.some((l) => /\bunbreaking\s+(?:iii|3)\b/i.test(l))) {
    enchants.push('unbreaking_3');
  }
  if (!enchants.includes('aqua_affinity') && lines.some((l) => /\baqua\s+affinity\b/i.test(l))) {
    enchants.push('aqua_affinity');
  }

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
  if (xpCount < 320 && bot.experience.level < 10) {
    missing.push(`Yeterli Bottle o' Enchanting (Hedef: 5 stack / 320 adet, sende: ${xpCount})`);
  }

  return {
    ready: missing.length === 0,
    missing,
    hasFinished: false,
  };
}

// Bir esyanin hedeflenen siparis ile eslesip eslesmedigini kontrol eder
function matchesTargetOrder(target, it) {
  if (!it) return false;
  if (it.name.includes('glass') || it.name === 'barrier') return false;

  if (target.id === 'helmet') {
    return isCleanHelmet(it) || it.name === 'diamond_helmet' || (it.displayName && it.displayName.toLowerCase().includes('diamond helmet'));
  }
  if (target.id === 'xp') {
    return it.name === 'experience_bottle' || (it.displayName && it.displayName.toLowerCase().includes('bottle'));
  }

  if (it.name === 'enchanted_book') {
    if (target.predicate && target.predicate(it)) return true;
    const enchants = getEnchants(it);
    if (target.id === 'blast') return enchants.includes('blast_prot_4');
    if (target.id === 'resp') return enchants.includes('resp_3');
    if (target.id === 'mending') return enchants.includes('mending');
    if (target.id === 'unb') return enchants.includes('unbreaking_3');
    if (target.id === 'aqua') return enchants.includes('aqua_affinity');

    // Metin uzerinden son care
    const text = ((it.displayName || '') + ' ' + (loreOf(it) || []).join(' ')).toLowerCase();
    if (target.id === 'blast' && (text.includes('blast protection') || text.includes('blast prot'))) return true;
    if (target.id === 'resp' && text.includes('respiration')) return true;
    if (target.id === 'mending' && text.includes('mending')) return true;
    if (target.id === 'unb' && text.includes('unbreaking')) return true;
    if (target.id === 'aqua' && text.includes('aqua affinity')) return true;
  }
  return false;
}

// Toplama: Botun ustune (envanterine) bakar, 5 God Helmet icin eksik olanlari tespit eder.
// /orders -> 51 (Your Orders) menusunden her eksik esyanin siparis slotunu bulur,
// siparis sandigina girip (slot 13) eksik miktarlari toplu ceker!
async function collectHelmetMaterials(token) {
  const bot = state.bot;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  const S = state.S || {};
  const batchTarget = S.godHelmetCraftBatch || 5;

  // 1. Botun ustune bak: Mevcut malzeme sayilari nedir?
  const items = bot.inventory.items();
  const cleanHelmets = items.filter(isCleanHelmet).length;
  const s1Helmets = items.filter(isStep1Helmet).length;
  const s3Helmets = items.filter(isStep3Helmet).length;
  const godHelmets = items.filter(isGodHelmet).length;
  const totalHelmets = cleanHelmets + s1Helmets + s3Helmets + godHelmets;

  const blastBooks = items.filter(isBlastProt4Book).length;
  const respBooks = items.filter(isResp3Book).length;
  const mendingBooks = items.filter(isMendingBook).length;
  const s2Books = items.filter(isStep2Book).length;
  const unbBooks = items.filter(isUnbreaking3Book).length;
  const aquaBooks = items.filter(isAquaAffinityBook).length;
  const s4Books = items.filter(isStep4Book).length;

  const xpCount = items.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);

  const needHelmetCount = Math.max(0, batchTarget - totalHelmets);
  const needBlastCount = Math.max(0, batchTarget - (blastBooks + s1Helmets + s3Helmets + godHelmets));
  const needRespCount = Math.max(0, batchTarget - (respBooks + s2Books + s3Helmets + godHelmets));
  const needMendingCount = Math.max(0, batchTarget - (mendingBooks + s2Books + s3Helmets + godHelmets));
  const needUnbCount = Math.max(0, batchTarget - (unbBooks + s4Books + godHelmets));
  const needAquaCount = Math.max(0, batchTarget - (aquaBooks + s4Books + godHelmets));
  // 5 kask icin tam 5 stack (320 adet) XP sisesi hedefle (5 kask + 25 kitap + 5 xp = 35 slot, 1 slot örs icin bos kalir)
  const needXpCount = Math.max(0, 320 - xpCount);

  const targets = [];
  if (needHelmetCount > 0) targets.push({ id: 'helmet', name: 'Diamond Helmet', predicate: isCleanHelmet, neededCount: needHelmetCount });
  if (needBlastCount > 0) targets.push({ id: 'blast', name: 'Blast Protection 4 Kitabı', predicate: isBlastProt4Book, neededCount: needBlastCount });
  if (needRespCount > 0) targets.push({ id: 'resp', name: 'Respiration 3 Kitabı', predicate: isResp3Book, neededCount: needRespCount });
  if (needMendingCount > 0) targets.push({ id: 'mending', name: 'Mending Kitabı', predicate: isMendingBook, neededCount: needMendingCount });
  if (needUnbCount > 0) targets.push({ id: 'unb', name: 'Unbreaking 3 Kitabı', predicate: isUnbreaking3Book, neededCount: needUnbCount });
  if (needAquaCount > 0) targets.push({ id: 'aqua', name: 'Aqua Affinity Kitabı', predicate: isAquaAffinityBook, neededCount: needAquaCount });
  if (needXpCount > 0) targets.push({ id: 'xp', name: "Bottle o' Enchanting", predicate: (it) => it && it.name === 'experience_bottle', neededCount: needXpCount });

  if (targets.length === 0) {
    log(`✅ God Helmet için hedeflenen ${batchTarget} kasklık tüm malzemeler zaten üstünde/envanterde mevcut.`);
    return;
  }

  log(`📦 Depodan eksikler çekilecek (Hedef: ${batchTarget} set): ${targets.map((t) => `${t.name} (${t.neededCount}x)`).join(', ')}`);

  if (!state.existingOrderTypes) state.existingOrderTypes = new Set();
  const missingOrderTargets = [];

  for (const target of targets) {
    assertActive(token);

    // 1. /orders penceresini ac
    closeWindowSafe();
    await humanSleep(300);
    try {
      await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);
    } catch (e) {
      log(`Sipariş penceresi (/orders) açılamadı (${e.message}), sonraki malzemeye geçiliyor.`);
      continue;
    }
    assertActive(token);

    // 2. Slot 51'e tıkla ("Orders -> Your Orders" acilir)
    const yourOrdersPromise = waitForWindow();
    yourOrdersPromise.catch(() => {});
    await safeClick(51);
    let yourOrdersWin;
    try {
      yourOrdersWin = await yourOrdersPromise;
    } catch (e) {
      log(`"Your Orders" penceresi açılamadı (${e.message}).`);
      closeWindowSafe();
      continue;
    }
    await humanSleep(500);
    assertActive(token);

    // 3. Your Orders icinde tum aktif siparisleri tara ve hedefi bul
    let orderSlot = -1;
    for (let s = 0; s < yourOrdersWin.inventoryStart; s++) {
      const it = yourOrdersWin.slots[s];
      if (!it || it.name.includes('glass') || it.name === 'barrier') continue;

      // Tum aktif siparis tiplerini kaydet (cift siparis acilmasini onler)
      for (const checkType of ['helmet', 'blast', 'resp', 'mending', 'unb', 'aqua', 'xp']) {
        if (matchesTargetOrder({ id: checkType }, it)) {
          state.existingOrderTypes.add(checkType);
        }
      }

      if (orderSlot === -1 && matchesTargetOrder(target, it)) {
        orderSlot = s;
      }
    }

    if (orderSlot === -1) {
      log(`⚠️ Depoda ${target.name} siparişi bulunamadı (otomatik sipariş verilecek).`);
      missingOrderTargets.push(target);
      closeWindowSafe();
      await humanSleep(300);
      continue;
    }

    log(`📦 Depoda ${target.name} siparişi bulundu (Slot ${orderSlot}). Teslimat sandığı açılıyor...`);

    // 4. Order slotuna tikla ("Orders -> Edit Order" acilir)
    const editOrderPromise = waitForWindow();
    editOrderPromise.catch(() => {});
    await safeClick(orderSlot);
    let editOrderWin;
    try {
      editOrderWin = await editOrderPromise;
    } catch (e) {
      log(`"Edit Order" penceresi açılamadı (${e.message}).`);
      closeWindowSafe();
      continue;
    }
    await humanSleep(400);
    assertActive(token);

    // 5. Slot 13'e tikla (Chest - "Orders -> Collect Items" acilir)
    const collectPromise = waitForWindow();
    collectPromise.catch(() => {});
    await safeClick(13);
    let collectWin;
    try {
      collectWin = await collectPromise;
    } catch (e) {
      log(`"Collect Items" teslimat penceresi açılamadı (${e.message}).`);
      closeWindowSafe();
      continue;
    }
    assertActive(token);

    // Sandık içeriklerinin sunucudan yüklenmesini bekle (en fazla 4 saniye)
    const startWait = Date.now();
    while (Date.now() - startWait < 4000) {
      collectWin = bot.currentWindow || collectWin;
      const hasItem = collectWin && collectWin.slots && collectWin.slots.slice(0, collectWin.inventoryStart).some(
        (it) => it && !it.name.includes('glass') && it.name !== 'barrier' && it.name !== 'arrow' && it.name !== 'bedrock'
      );
      if (hasItem) break;
      await sleep(150);
    }
    collectWin = bot.currentWindow || collectWin;
    await humanSleep(300);
    assertActive(token);

    // 6. Teslimat sandigi icinde esyalari bul ve hedef miktar dolana kadar shift-click yap
    let takenCount = 0;
    const maxToTake = target.neededCount || 1;

    for (let cs = 0; cs < collectWin.inventoryStart; cs++) {
      if (target.id === 'xp') {
        const curXp = bot.inventory.items().filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
        if (curXp >= 320) break;
        if (bot.inventory.emptySlotCount() === 0 && !bot.inventory.items().some((i) => i.name === 'experience_bottle' && i.count < 64)) {
          break;
        }
      } else {
        if (takenCount >= maxToTake) break;
        if (bot.inventory.emptySlotCount() === 0) break;
      }

      const it = collectWin.slots[cs];
      if (!it || it.name.includes('glass') || it.name === 'barrier' || it.name === 'arrow' || it.name === 'bedrock') continue;

      if (matchesTargetOrder(target, it)) {
        const qty = it.count || 1;
        log(`📦 Teslimat sandığından ${qty} adet ${target.name} alınıyor (slot ${cs})...`);
        await humanSleep(state.S.clickDelayMs || 400);
        await bot.clickWindow(cs, 0, 1); // shift-click
        await humanSleep(CFG.shiftWaitMs || 800);
        takenCount += (target.id === 'xp' ? qty : 1);
      }
    }

    if (takenCount > 0) {
      log(`✅ ${takenCount} adet ${target.name} başarıyla depodan envantere alındı.`);
    } else {
      log(`⏳ ${target.name} teslimat sandığında henüz hazır ürün yok (oyuncuların teslim etmesi bekleniyor).`);
    }

    closeWindowSafe();
    await humanSleep(400);
  }

  // Eger depoda henuz siparisi acilmamis malzemeler varsa HEMEN ac (sonsuz 30 sn beklemesini onler)
  if (missingOrderTargets.length > 0) {
    await ensureMissingOrders(token, missingOrderTargets);
  }

  // Son durum kontrolu
  const finalStatus = checkHelmetMaterials();
  if (finalStatus.ready) {
    log('🎉 Depodan eksikler çekildi, God Helmet üretimi için malzemeler hazır!');
  } else {
    log(`ℹ️ Depo taraması bitti. Kalan eksikler: ${finalStatus.missing.join(', ')}`);
  }
}

// Depoda siparişi olmayan malzemeler için sipariş açar (XP için 3200, diğerleri için 50)
async function ensureMissingOrders(token, specificTargets = null, forcePreOrder = false) {
  const bot = state.bot;
  assertActive(token);
  const S = state.S || {};
  const batchAmount = S.godHelmetBatchOrderAmount || 50;
  const existingOrders = state.existingOrderTypes || new Set();
  const toOrder = [];
  const items = bot.inventory.items();

  const isNeeded = (id) => {
    if (!specificTargets) return true;
    return specificTargets.some((t) => t.id === id);
  };

  const hasHelmet = !forcePreOrder && (items.some(isCleanHelmet) || items.some(isStep1Helmet) || items.some(isStep3Helmet));
  if (!hasHelmet && !existingOrders.has('helmet') && isNeeded('helmet')) {
    toOrder.push({
      item: 'Diamond Helmet',
      itemId: 'diamond_helmet',
      signText: 'Diamond Helmet',
      selectSlot: 0,
      orderSearchQuery: 'diamond helmet',
      orderAmount: batchAmount,
      category: 'Kask',
    });
  }

  const hasBlast = !forcePreOrder && (items.some(isStep1Helmet) || items.some(isStep3Helmet) || items.some(isBlastProt4Book));
  if (!hasBlast && !existingOrders.has('blast') && isNeeded('blast')) {
    toOrder.push({
      item: 'Enchanted Book Blast Protection 4',
      itemId: 'enchanted_book',
      signText: 'blast prot',
      targetEnchant: 'blast_prot_4',
      matchLore: 'blast protection',
      orderSearchQuery: 'enchanted book blast protection 4',
      orderAmount: batchAmount,
      orderPrice: S.bookBlastOrderPrice || 15000,
      isEnchantException: true,
      fixedPrice: true,
      category: 'Kitap',
    });
  }

  const hasResp = !forcePreOrder && (items.some(isStep3Helmet) || items.some(isStep2Book) || items.some(isResp3Book));
  if (!hasResp && !existingOrders.has('resp') && isNeeded('resp')) {
    toOrder.push({
      item: 'Enchanted Book Respiration 3',
      itemId: 'enchanted_book',
      signText: 'respiration',
      targetEnchant: 'resp_3',
      matchLore: 'respiration',
      orderSearchQuery: 'enchanted book respiration 3',
      orderAmount: batchAmount,
      orderPrice: S.bookRespOrderPrice || 15000,
      isEnchantException: true,
      fixedPrice: true,
      category: 'Kitap',
    });
  }

  const hasMending = !forcePreOrder && (items.some(isStep3Helmet) || items.some(isStep2Book) || items.some(isMendingBook));
  if (!hasMending && !existingOrders.has('mending') && isNeeded('mending')) {
    toOrder.push({
      item: 'Enchanted Book Mending',
      itemId: 'enchanted_book',
      signText: 'mending',
      targetEnchant: 'mending',
      matchLore: 'mending',
      orderSearchQuery: 'enchanted book mending',
      orderAmount: batchAmount,
      orderPrice: S.bookMendingOrderPrice || 25000,
      isEnchantException: true,
      fixedPrice: true,
      category: 'Kitap',
    });
  }

  const hasUnb = !forcePreOrder && (items.some(isStep4Book) || items.some(isUnbreaking3Book));
  if (!hasUnb && !existingOrders.has('unb') && isNeeded('unb')) {
    toOrder.push({
      item: 'Enchanted Book Unbreaking 3',
      itemId: 'enchanted_book',
      signText: 'unbreaking',
      targetEnchant: 'unbreaking_3',
      matchLore: 'unbreaking',
      orderSearchQuery: 'enchanted book unbreaking 3',
      orderAmount: batchAmount,
      orderPrice: S.bookUnbOrderPrice || 15000,
      isEnchantException: true,
      fixedPrice: true,
      category: 'Kitap',
    });
  }

  const hasAqua = !forcePreOrder && (items.some(isStep4Book) || items.some(isAquaAffinityBook));
  if (!hasAqua && !existingOrders.has('aqua') && isNeeded('aqua')) {
    toOrder.push({
      item: 'Enchanted Book Aqua Affinity',
      itemId: 'enchanted_book',
      signText: 'aqua affinity',
      targetEnchant: 'aqua_affinity',
      matchLore: 'aqua affinity',
      orderSearchQuery: 'enchanted book aqua affinity',
      orderAmount: batchAmount,
      orderPrice: S.bookAquaOrderPrice || 10000,
      isEnchantException: true,
      fixedPrice: true,
      category: 'Kitap',
    });
  }

  // XP sisesi depoda siparisi yoksa SAQDECE 3200 adetlik toplu siparis ac (canli /orders panosundan dinamik fiyatla)
  if (!existingOrders.has('xp') && isNeeded('xp')) {
    const bottleQty = 3200;
    toOrder.push({
      item: "Bottle o' Enchanting",
      itemId: 'experience_bottle',
      signText: "Bottle o' Enchanting",
      selectSlot: 0,
      orderSearchQuery: 'bottle o enchanting',
      orderAmount: bottleQty,
      category: 'XP Şişesi',
    });
  }

  if (toOrder.length > 0) {
    log(`🚀 TOPLU SIPARIS: Eksik ${toOrder.length} kalem malzeme icin siparisler aciliyor...`);
    for (const itemOrder of toOrder) {
      assertActive(token);
      const priceStr = itemOrder.orderPrice ? `$${Number(itemOrder.orderPrice).toLocaleString()}` : 'Canlı /orders fiyatı';
      log(`Siparis panoya veriliyor: ${itemOrder.orderAmount}x ${itemOrder.item} (${priceStr})...`);
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
        existingOrders.add(itemOrder.category === 'XP Şişesi' ? 'xp' : (
          itemOrder.itemId === 'diamond_helmet' ? 'helmet' : itemOrder.targetEnchant.split('_')[0]
        ));
        await humanSleep(2000);
      } catch (err) {
        log(`Bilgi: ${itemOrder.item} siparisi verilirken (${err.message}), diger malzemelere devam ediliyor.`);
        closeWindowSafe();
        await humanSleep(1500);
      }
    }
  }
}

// 🚀 PIPELINING: Sıradaki partiler için eksik olan siparişleri arka planda açar
async function preOrderNextBatch(token) {
  const bot = state.bot;
  assertActive(token);
  dlog('📦 Ön Sipariş (Pipelining) kontrolü yapılıyor...');

  closeWindowSafe();
  await humanSleep(300);

  try {
    await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);
  } catch (e) {
    dlog(`Ön sipariş için /orders açılamadı (${e.message}).`);
    return;
  }
  assertActive(token);

  const yourOrdersPromise = waitForWindow();
  yourOrdersPromise.catch(() => {});
  await safeClick(51);
  let yourOrdersWin;
  try {
    yourOrdersWin = await yourOrdersPromise;
  } catch (e) {
    dlog(`Ön sipariş için "Your Orders" penceresi açılamadı (${e.message}).`);
    closeWindowSafe();
    return;
  }
  await humanSleep(500);
  assertActive(token);

  const activeOrders = new Set();
  for (let s = 0; s < yourOrdersWin.inventoryStart; s++) {
    const it = yourOrdersWin.slots[s];
    if (!it || it.name.includes('glass') || it.name === 'barrier') continue;
    for (const checkType of ['helmet', 'blast', 'resp', 'mending', 'unb', 'aqua', 'xp']) {
      if (matchesTargetOrder({ id: checkType }, it)) {
        activeOrders.add(checkType);
      }
    }
  }

  closeWindowSafe();
  await humanSleep(300);

  const allReq = ['helmet', 'blast', 'resp', 'mending', 'unb', 'aqua', 'xp'];
  const missingTypes = allReq.filter((t) => !activeOrders.has(t));
  if (missingTypes.length > 0) {
    log(`🚀 ÖN SİPARİŞ (Pipelining): Sıradaki partiler için panoda eksik ${missingTypes.length} sipariş açılıyor: ${missingTypes.join(', ')}...`);
    const missingTargets = missingTypes.map((id) => ({ id }));
    await ensureMissingOrders(token, missingTargets, true);
    log('✅ Ön siparişler panoya verildi. Birleştirme veya satış sürerken teslimatlar arka planda sandığa akacak.');
  } else {
    dlog('Ön sipariş: 7 temel malzemenin siparişleri panoda zaten aktif.');
  }
}

// Malzemeleri Kontrol Et ("Üstüne bak"), Eksikleri Sandiktan Cek, Yoksa Toplu Siparis Ver (50x / 3200x)
async function ensureAllMaterialsOrOrder(token) {
  const bot = state.bot;
  assertActive(token);
  const S = state.S || {};

  // 1. Botun kendi ustune bak: Zaten en az 1 kasklik malzeme hazir mi?
  let status = checkHelmetMaterials();
  if (status.ready) {
    dlog('God Helmet icin gereken malzemeler ustunde zaten mevcut.');
  }

  // 2. Eksikleri depodan cek (5 set hedeflenir)
  log(`📦 Depodan God Helmet malzemeleri toplanıyor (Hedef: ${S.godHelmetCraftBatch || 5} set + XP)...`);
  try {
    await collectHelmetMaterials(token);
  } catch (err) {
    log(`Depo toplama uyarisi: ${err.message}`);
    closeWindowSafe();
    await humanSleep(400);
  }

  // 3. Eksik siparis varsa hemen ac
  await ensureMissingOrders(token);

  // 4. Tekrar ustune bak: En az 1 God Helmet yapacak malzeme var mi?
  status = checkHelmetMaterials();
  if (status.ready) {
    log('🎉 Malzemeler hazır, örste birleştirmeye geçilebilir!');
    try { await preOrderNextBatch(token); } catch (_) {}
    return;
  }

  // 5. Hazir degilse teslimat sandiklarini periyodik olarak tara
  log('⏳ Siparis teslimatlari bekleniyor. Her 30 saniyede bir depo taranacak...');
  const timeoutMs = Math.max(1, S.orderTimeoutMin || 60) * 60 * 1000;
  const startWait = Date.now();

  while (true) {
    assertActive(token);
    await sleep(30000);
    assertActive(token);

    log('📦 30 sn doldu: Depo taranıyor, teslim edilen eksikler çekiliyor...');
    await collectHelmetMaterials(token);
    await ensureMissingOrders(token);

    status = checkHelmetMaterials();
    if (status.ready) {
      log('🎉 God Helmet icin tum malzemeler eksiksiz tamamlandi! Ors birlestirmeye geciliyor...');
      try { await preOrderNextBatch(token); } catch (_) {}
      break;
    } else {
      log(`⏳ Eksik malzemeler bekleniyor (${status.missing.length} kalem): ${status.missing.join(', ')}...`);
    }

    if (Date.now() - startWait > timeoutMs) {
      await collectHelmetMaterials(token);
      status = checkHelmetMaterials();
      if (status.ready) break;
      throw new Error(`Siparis bekleme suresi doldu, eksikler var: ${status.missing.join(', ')}`);
    }
  }
}

// 2. 5 Adimli Toplu Birlestirme Agaci (Envanterdeki tum kask ve kitaplari 5'e kadar birlestirir)
async function craftGodHelmetOnly(token) {
  const bot = state.bot;
  assertActive(token);

  log('===== God Helmet Toplu Birlestirme Sureci Basliyor =====');

  // Adim 1: Helmet + Book (Blast Protection 4) [8 lv]
  let s1Count = 0;
  while (true) {
    assertActive(token);
    const cleanHelmet = bot.inventory.items().find(isCleanHelmet);
    const blastBook = bot.inventory.items().find(isBlastProt4Book);
    if (!cleanHelmet || !blastBook) break;

    s1Count++;
    log(`--- Adim 1/5 [${s1Count}]: Helmet + Blast Protection 4 (Gereken: 8 Lv) ---`);
    await ensureExperienceLevel(8, token);
    await combineInAnvil(isCleanHelmet, isBlastProt4Book, token);
    await humanSleep(600);
  }
  if (s1Count > 0) log(`✅ Adım 1 tamamlandı: ${s1Count} adet Blast Protection 4 kask hazır.`);

  // Adim 2: Book (Respiration 3) + Book (Mending) [2 lv]
  let s2Count = 0;
  while (true) {
    assertActive(token);
    const respBook = bot.inventory.items().find(isResp3Book);
    const mendingBook = bot.inventory.items().find(isMendingBook);
    if (!respBook || !mendingBook) break;

    s2Count++;
    log(`--- Adim 2/5 [${s2Count}]: Respiration 3 + Mending (Gereken: 2 Lv) ---`);
    await ensureExperienceLevel(2, token);
    await combineInAnvil(isResp3Book, isMendingBook, token);
    await humanSleep(600);
  }
  if (s2Count > 0) log(`✅ Adım 2 tamamlandı: ${s2Count} adet Respiration 3 + Mending kitabı hazır.`);

  // Adim 3: Helmet (Blast Prot 4) + Book (Resp 3, Mending) [10 lv]
  let s3Count = 0;
  while (true) {
    assertActive(token);
    const s1Helmet = bot.inventory.items().find((it) => isStep1Helmet(it) || (it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4') && !getEnchants(it).includes('resp_3')));
    const s2Book = bot.inventory.items().find((it) => isStep2Book(it) || (it && it.name === 'enchanted_book' && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending')));
    if (!s1Helmet || !s2Book) break;

    s3Count++;
    log(`--- Adim 3/5 [${s3Count}]: Blast Prot 4 Kask + (Resp 3 + Mending) (Gereken: 10 Lv) ---`);
    await ensureExperienceLevel(10, token);
    await combineInAnvil(
      (it) => isStep1Helmet(it) || (it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4') && !getEnchants(it).includes('resp_3')),
      (it) => isStep2Book(it) || (it && it.name === 'enchanted_book' && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending')),
      token
    );
    await humanSleep(600);
  }
  if (s3Count > 0) log(`✅ Adım 3 tamamlandı: ${s3Count} adet 3 Büyülü Kask hazır.`);

  // Adim 4: Book (Unbreaking 3) + Book (Aqua Affinity) [2 lv]
  let s4Count = 0;
  while (true) {
    assertActive(token);
    const unbBook = bot.inventory.items().find(isUnbreaking3Book);
    const aquaBook = bot.inventory.items().find(isAquaAffinityBook);
    if (!unbBook || !aquaBook) break;

    s4Count++;
    log(`--- Adim 4/5 [${s4Count}]: Unbreaking 3 + Aqua Affinity (Gereken: 2 Lv) ---`);
    await ensureExperienceLevel(2, token);
    await combineInAnvil(isUnbreaking3Book, isAquaAffinityBook, token);
    await humanSleep(600);
  }
  if (s4Count > 0) log(`✅ Adım 4 tamamlandı: ${s4Count} adet Unbreaking 3 + Aqua Affinity kitabı hazır.`);

  // Adim 5: Final God Helmet [9 lv]
  let s5Count = 0;
  while (true) {
    assertActive(token);
    const s3Helmet = bot.inventory.items().find((it) => isStep3Helmet(it) || (it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4') && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending') && !getEnchants(it).includes('unbreaking_3')));
    const s4Book = bot.inventory.items().find((it) => isStep4Book(it) || (it && it.name === 'enchanted_book' && getEnchants(it).includes('unbreaking_3') && getEnchants(it).includes('aqua_affinity')));
    if (!s3Helmet || !s4Book) break;

    s5Count++;
    log(`--- Adim 5/5 [${s5Count}]: Final Birleştirme ➔ GOD HELMET (Gereken: 9 Lv) ---`);
    await ensureExperienceLevel(9, token);
    await combineInAnvil(
      (it) => isStep3Helmet(it) || (it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4') && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending') && !getEnchants(it).includes('unbreaking_3')),
      (it) => isStep4Book(it) || (it && it.name === 'enchanted_book' && getEnchants(it).includes('unbreaking_3') && getEnchants(it).includes('aqua_affinity')),
      token
    );
    await humanSleep(600);
    bumpStats({ godHelmetsCrafted: 1 });
  }

  const finishedHelmets = bot.inventory.items().filter(isGodHelmet);
  log(`🎉 GOD HELMET URETIMI TAMAMLANDI! Envanterde toplam ${finishedHelmets.length} adet tamamlanmış God Helmet mevcut.`);
  return finishedHelmets;
}

// Siparis ve Toplama Dahil Tam Uretim Akisi
async function craftGodHelmet(token) {
  const bot = state.bot;
  assertActive(token);

  const existingGodHelmets = bot.inventory.items().filter(isGodHelmet);
  const matStatus = checkHelmetMaterials();
  if (existingGodHelmets.length >= 5 || (existingGodHelmets.length > 0 && !matStatus.ready)) {
    log(`Envanterde zaten ${existingGodHelmets.length} adet tamamlanmış God Helmet mevcut! Satışa geçiliyor...`);
    return existingGodHelmets;
  }

  // Malzemeleri kontrol et, eksik olanlari /orders uzerinden siparis et ve topla
  await ensureAllMaterialsOrOrder(token);

  return await craftGodHelmetOnly(token);
}

// 3. Piyasa Taramasi ve Satis
function isGodHelmetMarketItem(it) {
  if (!it || it.name !== 'diamond_helmet') return false;

  // 1. Eger raw item varsa getEnchants ile kesin kontrol
  if (it.raw) {
    const enchs = getEnchants(it.raw);
    const hasAll = ['blast_prot_4', 'resp_3', 'mending', 'unbreaking_3', 'aqua_affinity'].every((e) => enchs.includes(e));
    if (hasAll) return true;
  }

  // 2. Lore satirlari uzerinden kesin regex kontrolu (fiyat ve diger sayilarla karismayacak sekilde satir satir)
  const lines = [it.display, ...(Array.isArray(it.lore) ? it.lore : [])].filter(Boolean);

  const hasBlast = lines.some((l) => /\bblast\s+prot(?:ection)?\s+(?:iv|4)\b/i.test(l));
  const hasResp = lines.some((l) => /\brespiration\s+(?:iii|3)\b/i.test(l));
  const hasMending = lines.some((l) => /\bmending\b/i.test(l));
  const hasUnb = lines.some((l) => /\bunbreaking\s+(?:iii|3)\b/i.test(l));
  const hasAqua = lines.some((l) => /\baqua\s+affinity\b/i.test(l));

  return hasBlast && hasResp && hasMending && hasUnb && hasAqua;
}

// /ah pazarinda en ucuz God Helmet fiyatini sorgular
async function fetchLowestGodHelmetPrice(token) {
  const bot = state.bot;
  assertActive(token);

  const cmd = '/ah diamond_helmet Blast Protection 4 Respiration 3 Mending Unbreaking 3 Aqua Affinity';
  dlog(`God Helmet piyasa fiyati sorgulaniyor: ${cmd}`);

  let win;
  try {
    win = await executeCommandWindow(cmd, 10000, 2);
  } catch (e) {
    log(`Piyasa penceresi acilmadi (${e.message}), varsayılan taban fiyat uygulanacak.`);
    return null;
  }
  assertActive(token);

  // AH slotlarının sunucudan gelmesini bekle (en fazla 4 sn)
  const startWait = Date.now();
  while (Date.now() - startWait < 4000) {
    const curWin = bot.currentWindow || win;
    const hasItems = curWin && curWin.slots && curWin.slots.slice(0, curWin.inventoryStart).some(
      (it) => it && it.name === 'diamond_helmet'
    );
    if (hasItems) break;
    await sleep(200);
  }
  await humanSleep(400);

  const snap = snapshotWindow(bot.currentWindow || win);
  closeWindowSafe();
  await humanSleep(300);

  if (!snap) return null;

  let lowest = null;
  let matchCount = 0;
  for (const it of snap.slots) {
    if (!isGodHelmetMarketItem(it)) continue;
    matchCount++;

    for (const p of it.prices) {
      // Bir God Helmet asla $100,000 altinda olamaz; bakiye/harcama gibi sahte sayilari filtrele
      if (p.value >= 100000 && (lowest === null || p.value < lowest)) {
        lowest = p.value;
      }
    }
  }

  if (lowest !== null) {
    log(`Piyasadaki en ucuz God Helmet: $${lowest.toLocaleString()} (${matchCount} gerçek God Helmet ilanı tarandı)`);
  } else {
    log('Piyasada geçerli 5 büyülü God Helmet ilanı bulunamadı, varsayılan taban fiyat uygulanacak.');
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
  const fallback = Math.max(900000, S.godHelmetSellPrice || 900000);
  const minPriceSetting = Math.max(900000, S.godHelmetMinSellPrice || 900000);
  const undercut = S.godHelmetUndercut || 1000;
  const totalCost = calculateGodHelmetCost();
  const minProfitMargin = S.godHelmetMinProfit || 25000;
  const absoluteFloor = Math.max(minPriceSetting, totalCost + minProfitMargin);

  if (lowest === null || lowest === undefined) {
    return Math.max(fallback, absoluteFloor);
  }

  let price = lowest - undercut;
  if (price < absoluteFloor) {
    log(`🛡️ TABAN FİYAT KORUMASI: Pazardaki en ucuz ilan ($${lowest.toLocaleString()}) minimum taban fiyatımızın ($${absoluteFloor.toLocaleString()}) altında. Zarar etmemek ve hedefin altına inmemek için $${absoluteFloor.toLocaleString()} fiyatından listeleniyor.`);
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

// Envanterdeki tüm God Helmet'ları sırayla satışa sunar
async function sellAllGodHelmets(token) {
  const bot = state.bot;
  assertActive(token);

  let helmets = bot.inventory.items().filter(isGodHelmet);
  if (helmets.length === 0) {
    log('Satılacak God Helmet bulunamadı.');
    return;
  }

  log(`🏷️ Envanterde ${helmets.length} adet God Helmet bulundu. Sırayla satışa sunuluyor...`);
  let soldCount = 0;
  const initialTotal = helmets.length;

  while (true) {
    assertActive(token);
    const targetHelmet = bot.inventory.items().find(isGodHelmet);
    if (!targetHelmet) break;

    soldCount++;
    log(`[${soldCount}/${initialTotal}] God Helmet ilana koyuluyor...`);
    await sellGodHelmet(token);
    await humanSleep(1500);
  }

  log(`✅ Toplam ${soldCount} adet God Helmet başarıyla satışa sunuldu.`);
}

module.exports = {
  getEnchants,
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
  isGodHelmet,
  checkHelmetMaterials,
  collectHelmetMaterials,
  craftGodHelmet,
  craftGodHelmetOnly,
  calculateGodHelmetCost,
  fetchLowestGodHelmetPrice,
  computeGodHelmetSellPrice,
  sellGodHelmet,
  sellAllGodHelmets,
  preOrderNextBatch,
};
