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

  // 2. Metin analizi yedegi (custom lore ve displayName)
  const lore = (loreOf(item) || []).join(' ').toLowerCase();
  const name = (item.displayName || item.name || '').toLowerCase();
  const allText = `${name} ${lore}`;

  if (!enchants.includes('blast_prot_4') && (
    allText.includes('blast protection 4') || allText.includes('blast protection iv') ||
    allText.includes('blast prot 4') || allText.includes('blast prot iv') ||
    (allText.includes('blast') && (allText.includes('4') || allText.includes('iv')))
  )) {
    enchants.push('blast_prot_4');
  }
  if (!enchants.includes('resp_3') && (
    allText.includes('respiration 3') || allText.includes('respiration iii') ||
    (allText.includes('respiration') && (allText.includes('3') || allText.includes('iii')))
  )) {
    enchants.push('resp_3');
  }
  if (!enchants.includes('mending') && allText.includes('mending')) {
    enchants.push('mending');
  }
  if (!enchants.includes('unbreaking_3') && (
    allText.includes('unbreaking 3') || allText.includes('unbreaking iii') ||
    (allText.includes('unbreaking') && (allText.includes('3') || allText.includes('iii')))
  )) {
    enchants.push('unbreaking_3');
  }
  if (!enchants.includes('aqua_affinity') && (
    allText.includes('aqua affinity') || allText.includes('aqua affinity 1') || allText.includes('aqua affinity i')
  )) {
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
  if (xpCount < 30 && bot.experience.level < 10) {
    missing.push(`Yeterli Bottle o' Enchanting (En az 30-60 adet, sende: ${xpCount})`);
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

// Toplama: Botun ustune (envanterine) bakar, 1 God Helmet icin eksik olanlari tespit eder.
// /orders -> 51 (Your Orders) menusunden her eksik esyanin siparis slotunu bulur,
// siparis sandigina girip (slot 13) 1'er adet eksik esyayi ceker!
async function collectHelmetMaterials(token) {
  const bot = state.bot;
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  // 1. Botun ustune bak: Hangileri eksik?
  const items = bot.inventory.items();
  const needHelmet = !items.some(isCleanHelmet) && !items.some(isStep1Helmet) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  const needBlast = !items.some(isBlastProt4Book) && !items.some(isStep1Helmet) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  const needResp = !items.some(isResp3Book) && !items.some(isStep2Book) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  const needMending = !items.some(isMendingBook) && !items.some(isStep2Book) && !items.some(isStep3Helmet) && !items.some(isGodHelmet);
  const needUnb = !items.some(isUnbreaking3Book) && !items.some(isStep4Book) && !items.some(isGodHelmet);
  const needAqua = !items.some(isAquaAffinityBook) && !items.some(isStep4Book) && !items.some(isGodHelmet);
  const xpCount = items.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
  const needXP = xpCount < 30 && bot.experience.level < 10;

  const targets = [];
  if (needHelmet) targets.push({ id: 'helmet', name: 'Diamond Helmet', predicate: isCleanHelmet });
  if (needBlast) targets.push({ id: 'blast', name: 'Blast Protection 4 Kitabı', predicate: isBlastProt4Book });
  if (needResp) targets.push({ id: 'resp', name: 'Respiration 3 Kitabı', predicate: isResp3Book });
  if (needMending) targets.push({ id: 'mending', name: 'Mending Kitabı', predicate: isMendingBook });
  if (needUnb) targets.push({ id: 'unb', name: 'Unbreaking 3 Kitabı', predicate: isUnbreaking3Book });
  if (needAqua) targets.push({ id: 'aqua', name: 'Aqua Affinity Kitabı', predicate: isAquaAffinityBook });
  if (needXP) targets.push({ id: 'xp', name: "Bottle o' Enchanting", predicate: (it) => it && it.name === 'experience_bottle' });

  if (targets.length === 0) {
    log('✅ God Helmet için gereken tüm malzemeler zaten üstünde/envanterde mevcut.');
    return;
  }

  log(`📦 Depodan sadece üstünde eksik olan ${targets.length} kalem malzeme çekilecek: ${targets.map((t) => t.name).join(', ')}`);

  if (!state.existingOrderTypes) state.existingOrderTypes = new Set();

  for (const target of targets) {
    assertActive(token);

    // Botun envanterine tekrar bak: onceki adimda geldiyse veya varsa atla
    const curItems = bot.inventory.items();
    if (target.id === 'helmet') {
      if (curItems.some(isCleanHelmet) || curItems.some(isStep1Helmet) || curItems.some(isStep3Helmet) || curItems.some(isGodHelmet)) {
        dlog(`Diamond Helmet zaten envanterde mevcut, atlanıyor.`);
        continue;
      }
    } else if (target.id === 'xp') {
      const curXp = curItems.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
      if (curXp >= 30 || bot.experience.level >= 10) continue;
    } else if (curItems.some(target.predicate)) {
      dlog(`${target.name} zaten envanterde mevcut, atlanıyor.`);
      continue;
    }

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
      log(`⚠️ Depoda ${target.name} siparişi bulunamadı (henüz sipariş açılmamış olabilir).`);
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

    // 6. Teslimat sandigi icinde esyayi bul ve shift-click yap
    // Bu sandik zaten hedef siparisin kendi ozel teslimat sandigidir!
    let itemTaken = false;
    for (let cs = 0; cs < collectWin.inventoryStart; cs++) {
      const it = collectWin.slots[cs];
      if (!it || it.name.includes('glass') || it.name === 'barrier' || it.name === 'arrow' || it.name === 'bedrock') continue;

      const isTargetItem = matchesTargetOrder(target, it);

      if (isTargetItem) {
        log(`📦 Teslimat sandığından 1 adet ${target.name} alınıyor (slot ${cs})...`);
        await humanSleep(state.S.clickDelayMs || 500);
        await bot.clickWindow(cs, 0, 1); // shift-click
        await humanSleep(CFG.shiftWaitMs || 1000);
        log(`✅ 1 adet ${target.name} başarıyla depodan envantere alındı.`);
        itemTaken = true;
        break;
      }
    }

    if (!itemTaken) {
      log(`⏳ ${target.name} teslimat sandığında henüz teslim edilmiş ürün yok (oyuncuların teslim etmesi bekleniyor).`);
    }

    closeWindowSafe();
    await humanSleep(400);
  }

  // Son durum kontrolu
  const finalStatus = checkHelmetMaterials();
  if (finalStatus.ready) {
    log('🎉 Depodan tüm eksikler tamamlandı, God Helmet üretimi için tüm malzemeler hazır!');
  } else {
    log(`ℹ️ Depo taraması bitti. Kalan eksikler: ${finalStatus.missing.join(', ')}`);
  }
}

// Malzemeleri Kontrol Et ("Üstüne bak"), Eksikleri Sandiktan Cek, Yoksa Toplu Siparis Ver (50x)
async function ensureAllMaterialsOrOrder(token) {
  const bot = state.bot;
  assertActive(token);
  const S = state.S || {};
  const batchAmount = S.godHelmetBatchOrderAmount || 50;

  // 1. Botun kendi ustune (envanterine) bak: Zaten hazir mi?
  let status = checkHelmetMaterials();
  if (status.ready) {
    dlog('God Helmet icin gereken tum malzemeler ustunde zaten mevcut.');
    return;
  }

  // 2. Eksik var: Once depoya gidip teslim edilmis olan eksikleri cek ("ustune bak ve eksikleri orderdan al")
  log(`📦 Üstünde eksik malzemeler var (${status.missing.join(', ')}). Depodan toplanıyor...`);
  try {
    await collectHelmetMaterials(token);
  } catch (err) {
    log(`Depo toplama uyarisi: ${err.message}`);
    closeWindowSafe();
    await humanSleep(400);
  }

  // 3. Tekrar ustune bak: Hepsi tamamlandi mi?
  status = checkHelmetMaterials();
  if (status.ready) {
    log('🎉 Depodan eksikler çekildi, God Helmet üretimi için tüm malzemeler hazır!');
    return;
  }

  // 4. Hala ustunde eksik olan malzemeler varsa ve depoda henuz siparisi acilmamissa toplu siparis ac (50x)
  const existingOrders = state.existingOrderTypes || new Set();
  const toOrder = [];
  const items = bot.inventory.items();

  const hasHelmet = items.some(isCleanHelmet) || items.some(isStep1Helmet) || items.some(isStep3Helmet);
  if (!hasHelmet && !existingOrders.has('helmet')) {
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

  if (!items.some(isStep1Helmet) && !items.some(isStep3Helmet) && !items.some(isBlastProt4Book) && !existingOrders.has('blast')) {
    toOrder.push({
      item: 'Enchanted Book Blast Protection 4',
      itemId: 'enchanted_book',
      signText: 'blast prot',
      targetEnchant: 'blast_prot_4',
      matchLore: 'blast protection',
      orderSearchQuery: 'enchanted book blast protection 4',
      orderAmount: batchAmount,
      orderPrice: S.bookBlastOrderPrice || 15000,
      category: 'Kitap',
    });
  }

  if (!items.some(isStep3Helmet) && !items.some(isStep2Book)) {
    if (!items.some(isResp3Book) && !existingOrders.has('resp')) {
      toOrder.push({
        item: 'Enchanted Book Respiration 3',
        itemId: 'enchanted_book',
        signText: 'respiration',
        targetEnchant: 'resp_3',
        matchLore: 'respiration',
        orderSearchQuery: 'enchanted book respiration 3',
        orderAmount: batchAmount,
        orderPrice: S.bookRespOrderPrice || 15000,
        category: 'Kitap',
      });
    }
    if (!items.some(isMendingBook) && !existingOrders.has('mending')) {
      toOrder.push({
        item: 'Enchanted Book Mending',
        itemId: 'enchanted_book',
        signText: 'mending',
        targetEnchant: 'mending',
        matchLore: 'mending',
        orderSearchQuery: 'enchanted book mending',
        orderAmount: batchAmount,
        orderPrice: S.bookMendingOrderPrice || 25000,
        category: 'Kitap',
      });
    }
  }

  if (!items.some(isStep4Book)) {
    if (!items.some(isUnbreaking3Book) && !existingOrders.has('unb')) {
      toOrder.push({
        item: 'Enchanted Book Unbreaking 3',
        itemId: 'enchanted_book',
        signText: 'unbreaking',
        targetEnchant: 'unbreaking_3',
        matchLore: 'unbreaking',
        orderSearchQuery: 'enchanted book unbreaking 3',
        orderAmount: batchAmount,
        orderPrice: S.bookUnbOrderPrice || 15000,
        category: 'Kitap',
      });
    }
    if (!items.some(isAquaAffinityBook) && !existingOrders.has('aqua')) {
      toOrder.push({
        item: 'Enchanted Book Aqua Affinity',
        itemId: 'enchanted_book',
        signText: 'aqua affinity',
        targetEnchant: 'aqua_affinity',
        matchLore: 'aqua affinity',
        orderSearchQuery: 'enchanted book aqua affinity',
        orderAmount: batchAmount,
        orderPrice: S.bookAquaOrderPrice || 10000,
        category: 'Kitap',
      });
    }
  }

  const xpCount = items.filter((i) => i.name === 'experience_bottle').reduce((sum, i) => sum + i.count, 0);
  if (xpCount < 30 && bot.experience.level < 10 && !existingOrders.has('xp')) {
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

  if (toOrder.length > 0) {
    log(`🚀 TOPLU SIPARIS: Eksik ${toOrder.length} kalem malzeme icin ${batchAmount}'er adet siparis veriliyor...`);
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
  }

  // 5. Periyodik olarak depoyu tara ve eksikleri topla
  log('⏳ Siparis teslimatlari bekleniyor. Her 30 saniyede bir depo taranacak...');
  const timeoutMs = Math.max(1, S.orderTimeoutMin || 60) * 60 * 1000;
  const startWait = Date.now();

  while (true) {
    assertActive(token);
    await sleep(30000);
    assertActive(token);

    log('📦 30 sn doldu: Depo taranıyor, teslim edilen eksikler çekiliyor...');
    await collectHelmetMaterials(token);

    status = checkHelmetMaterials();
    if (status.ready) {
      log('🎉 God Helmet icin tum malzemeler eksiksiz tamamlandi! Ors birlestirmeye geciliyor...');
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

// 2. 5 Adimli Birlestirme Agaci (Envanterdeki malzemelerle dogrudan birlestirir)
async function craftGodHelmetOnly(token) {
  const bot = state.bot;
  assertActive(token);

  let godHelmet = bot.inventory.items().find(isGodHelmet);
  if (godHelmet) {
    log('🎉 Envanterde zaten tamamlanmis bir God Helmet mevcut!');
    return godHelmet;
  }

  const matStatus = checkHelmetMaterials();
  if (!matStatus.ready) {
    log(`⚠️ Dikkat: Envanterde eksik malzemeler olabilir (${matStatus.missing.join(', ')}). Mevcut olanlarla adımlar deneniyor...`);
  }

  log('===== God Helmet Birlestirme Sureci Basliyor =====');

  // Adim 1: Helmet + Book (Blast Protection 4) [8 lv]
  let s1Helmet = bot.inventory.items().find(isStep1Helmet);
  let s3Helmet = bot.inventory.items().find(isStep3Helmet);

  if (!s1Helmet && !s3Helmet) {
    log('--- Adim 1/5: Helmet + Blast Protection 4 (Gereken: 8 Lv) ---');
    await ensureExperienceLevel(8, token);
    await combineInAnvil(isCleanHelmet, isBlastProt4Book, token);
    await humanSleep(800);
    s1Helmet = bot.inventory.items().find(isStep1Helmet) || bot.inventory.items().find((it) => it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4'));
    if (!s1Helmet && !bot.inventory.items().some(isStep3Helmet)) {
      throw new Error('Adim 1 basarisiz oldu (Blast Prot 4 kask olusmadi)!');
    }
  }
  log('✅ Adım 1 hazır: Blast Protection 4 kask mevcut.');

  // Adim 2: Book (Respiration 3) + Book (Mending) [2 lv]
  let s2Book = bot.inventory.items().find(isStep2Book);
  if (!s2Book && !s3Helmet) {
    log('--- Adim 2/5: Respiration 3 + Mending (Gereken: 2 Lv) ---');
    await ensureExperienceLevel(2, token);
    await combineInAnvil(isResp3Book, isMendingBook, token);
    await humanSleep(800);
    s2Book = bot.inventory.items().find(isStep2Book) || bot.inventory.items().find((it) => it && it.name === 'enchanted_book' && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending'));
    if (!s2Book && !bot.inventory.items().some(isStep3Helmet)) {
      throw new Error('Adim 2 basarisiz oldu (Resp 3 + Mending kitabi olusmadi)!');
    }
  }
  log('✅ Adım 2 hazır: Respiration 3 + Mending kitabı mevcut.');

  // Adim 3: Helmet (Blast Prot 4) + Book (Resp 3, Mending) [10 lv]
  if (!s3Helmet) {
    log('--- Adim 3/5: Helmet (Blast Prot 4) + Book (Resp 3, Mending) (Gereken: 10 Lv) ---');
    await ensureExperienceLevel(10, token);
    await combineInAnvil(
      (it) => isStep1Helmet(it) || (it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4')),
      (it) => isStep2Book(it) || (it && it.name === 'enchanted_book' && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending')),
      token
    );
    await humanSleep(800);
    s3Helmet = bot.inventory.items().find(isStep3Helmet) || bot.inventory.items().find((it) => it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4') && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending'));
    if (!s3Helmet) throw new Error('Adim 3 basarisiz oldu (3 buyulu kask olusmadi)!');
  }
  log('✅ Adım 3 hazır: 3 Büyülü Kask mevcut.');

  // Adim 4: Book (Unbreaking 3) + Book (Aqua Affinity) [2 lv]
  let s4Book = bot.inventory.items().find(isStep4Book);
  if (!s4Book) {
    log('--- Adim 4/5: Unbreaking 3 + Aqua Affinity (Gereken: 2 Lv) ---');
    await ensureExperienceLevel(2, token);
    await combineInAnvil(isUnbreaking3Book, isAquaAffinityBook, token);
    await humanSleep(800);
    s4Book = bot.inventory.items().find(isStep4Book) || bot.inventory.items().find((it) => it && it.name === 'enchanted_book' && getEnchants(it).includes('unbreaking_3') && getEnchants(it).includes('aqua_affinity'));
    if (!s4Book) throw new Error('Adim 4 basarisiz oldu (Unbreaking 3 + Aqua kitabi olusmadi)!');
  }
  log('✅ Adım 4 hazır: Unbreaking 3 + Aqua Affinity kitabı mevcut.');

  // Adim 5: Final God Helmet [9 lv]
  log('--- Adim 5/5: Final Birlestirme ➔ GOD HELMET (Gereken: 9 Lv) ---');
  await ensureExperienceLevel(9, token);
  await combineInAnvil(
    (it) => isStep3Helmet(it) || (it && it.name === 'diamond_helmet' && getEnchants(it).includes('blast_prot_4') && getEnchants(it).includes('resp_3') && getEnchants(it).includes('mending')),
    (it) => isStep4Book(it) || (it && it.name === 'enchanted_book' && getEnchants(it).includes('unbreaking_3') && getEnchants(it).includes('aqua_affinity')),
    token
  );
  await humanSleep(800);

  godHelmet = bot.inventory.items().find(isGodHelmet) || bot.inventory.items().find((it) => it && it.name === 'diamond_helmet' && getEnchants(it).length >= 5);
  if (!godHelmet) throw new Error('Adim 5 basarisiz oldu (God Helmet olusmadi)!');

  log('🎉 GOD HELMET BASARIYLA URETILDI!');
  bumpStats({ godHelmetsCrafted: 1 });
  return godHelmet;
}

// Siparis ve Toplama Dahil Tam Uretim Akisi
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

  // 2. Lore ve display metni uzerinden kontrol (hem Romen rakamlari hem sayisal format destekli)
  const text = ((it.lore || []).join(' ') + ' ' + (it.display || '')).toLowerCase();

  const hasBlast = text.includes('blast protection 4') || text.includes('blast protection iv') ||
                   text.includes('blast prot 4') || text.includes('blast prot iv') ||
                   (text.includes('blast') && (text.includes('4') || text.includes('iv')));

  const hasResp = text.includes('respiration 3') || text.includes('respiration iii') ||
                  (text.includes('respiration') && (text.includes('3') || text.includes('iii')));

  const hasMending = text.includes('mending');

  const hasUnb = text.includes('unbreaking 3') || text.includes('unbreaking iii') ||
                 (text.includes('unbreaking') && (text.includes('3') || text.includes('iii')));

  const hasAqua = text.includes('aqua affinity') || text.includes('aqua_affinity');

  return hasBlast && hasResp && hasMending && hasUnb && hasAqua;
}

// /ah pazarinda en ucuz God Helmet fiyatini sorgular
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

  // AH slotlarının sunucudan gelmesini bekle (en fazla 3 sn)
  const startWait = Date.now();
  while (Date.now() - startWait < 3000) {
    const curWin = bot.currentWindow || win;
    const hasItems = curWin && curWin.slots && curWin.slots.slice(0, curWin.inventoryStart).some(
      (it) => it && it.name === 'diamond_helmet'
    );
    if (hasItems) break;
    await sleep(150);
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
      if (lowest === null || p.value < lowest) lowest = p.value;
    }
  }

  if (lowest !== null) {
    log(`Piyasadaki en ucuz God Helmet: $${lowest.toLocaleString()} (${matchCount} ilan tarandı)`);
  } else {
    log('Piyasada eslesen God Helmet ilani bulunamadi, varsayılan satış fiyatı uygulanacak.');
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
  isCleanHelmet,
  isBlastProt4Book,
  isResp3Book,
  isMendingBook,
  isUnbreaking3Book,
  isAquaAffinityBook,
  isGodHelmet,
  checkHelmetMaterials,
  collectHelmetMaterials,
  craftGodHelmet,
  craftGodHelmetOnly,
  calculateGodHelmetCost,
  fetchLowestGodHelmetPrice,
  computeGodHelmetSellPrice,
  sellGodHelmet,
};
