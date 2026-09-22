'use strict';

const { Vec3 } = require('vec3');
const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { sleep, humanSleep, titleOf, filledSlots } = require('../utils/text');
const { loreOf, snapshotWindow } = require('../utils/inspect');
const { recordTransaction } = require('../stats');
const { runOrderFlow, waitForOrderComplete } = require('./order');
const { collectItems } = require('./collect');
const {
  assertActive,
  waitForWindow,
  waitForSlot,
  closeWindowSafe,
} = require('../utils/windows');

// 1. XP Seviyesi Saglama
async function ensureExperienceLevel(targetLevel, token) {
  const bot = state.bot;
  if (!bot) throw new Error('Bot bagli degil');
  assertActive(token);

  if (bot.experience.level >= targetLevel) {
    dlog(`XP seviyesi yeterli: ${bot.experience.level} >= ${targetLevel}`);
    return;
  }

  log(`XP yukleniyor: Mevcut Seviye ${bot.experience.level} ➔ Hedef: ${targetLevel}`);

  let xpItem = bot.inventory.items().find((i) => i.name === 'experience_bottle');
  if (!xpItem) {
    log('Envanterde XP sisesi bulunamadi. /orders uzerinden otomatik temin ediliyor...');
    const S = state.S || {};
    const xpOrder = {
      item: "Bottle o' Enchanting",
      itemId: 'experience_bottle',
      orderAmount: S.xpBottleOrderAmount || 64,
      orderPrice: S.xpBottleOrderPrice || 250,
      category: 'XP Şişesi',
    };

    const placedPrice = await runOrderFlow(token, xpOrder);
    recordTransaction({
      type: 'EXPENSE',
      category: 'XP Şişesi',
      item: "Bottle o' Enchanting",
      amount: xpOrder.orderAmount,
      unitPrice: placedPrice,
      total: xpOrder.orderAmount * placedPrice,
      note: 'Eksik XP için otomatik /orders alımı',
    });

    await waitForOrderComplete(token, placedPrice, xpOrder);
    await collectItems(token);

    xpItem = bot.inventory.items().find((i) => i.name === 'experience_bottle');
    if (!xpItem) {
      throw new Error('XP sisesi siparis edildi ve toplandi ancak envanterde experience_bottle bulunamadi!');
    }
  }

  // 1. Şişeyi eline al
  if (!bot.heldItem || bot.heldItem.name !== 'experience_bottle') {
    await bot.equip(xpItem, 'hand');
    await humanSleep(100);
  }

  // 2. Yere (tam ayak ucuna) bak: +Math.PI / 2 doğrudan aşağı/ayak ucuna bakar.
  // Bu sayede atılan şişe havada süzülmeden anında ayak ucunda kırılır ve sıfır gecikmeyle XP verir!
  try {
    await bot.look(bot.entity.yaw, Math.PI / 2, true);
  } catch (_) {}

  // 3. Ultra Hızlı Şişe Kırma (Fast Splash: 45ms seri tick)
  const startTime = Date.now();
  while (bot.experience.level < targetLevel) {
    assertActive(token);

    // Eldeki şişe stack'i bittiyse diğer stack'i ele al
    if (!bot.heldItem || bot.heldItem.name !== 'experience_bottle') {
      const nextXp = bot.inventory.items().find((i) => i.name === 'experience_bottle');
      if (!nextXp) {
        log('Envanterdeki tüm XP şişeleri tükendi!');
        break;
      }
      await bot.equip(nextXp, 'hand');
      await sleep(50);
    }

    // Seri şişe fırlat
    bot.activateItem();
    await sleep(45);

    // Güvenlik zaman aşımı
    if (Date.now() - startTime > 10000) {
      log('UYARI: XP yükleme zaman aşımına uğradı (10 sn), mevcut seviye ile devam ediliyor.');
      break;
    }
  }

  log(`Hedef seviyeye ulasildi: Seviye ${bot.experience.level} (Hedef ${targetLevel})`);
}

// 2. Ors Bulma / Yerlestirme / Satin Alma
function findAnvilBlock() {
  const bot = state.bot;
  if (!bot) return null;
  return bot.findBlock({
    matching: (b) => b && b.name && b.name.includes('anvil'),
    maxDistance: 4,
  });
}

async function placeAnvilFromInventory(token) {
  const bot = state.bot;
  assertActive(token);

  const anvilItem = bot.inventory.items().find((i) => i && i.name && i.name.includes('anvil'));
  if (!anvilItem) return false;

  log(`Envanterdeki ${anvilItem.name} yerlestiriliyor...`);
  await bot.equip(anvilItem, 'hand');
  await humanSleep(250);

  const pos = bot.entity.position.floored();
  const offsets = [
    new Vec3(1, -1, 0),
    new Vec3(-1, -1, 0),
    new Vec3(0, -1, 1),
    new Vec3(0, -1, -1),
    new Vec3(0, -1, 0),
  ];

  for (const off of offsets) {
    const groundPos = pos.plus(off);
    const groundBlock = bot.blockAt(groundPos);
    const abovePos = groundPos.offset(0, 1, 0);
    const aboveBlock = bot.blockAt(abovePos);

    if (groundBlock && groundBlock.boundingBox === 'block' && aboveBlock && aboveBlock.name === 'air') {
      try {
        await bot.placeBlock(groundBlock, new Vec3(0, 1, 0));
        await humanSleep(500);
        const placed = findAnvilBlock();
        if (placed) {
          log(`Ors basariyla yerlestirildi: ${placed.name} @ ${placed.position}`);
          try { await bot.unequip('hand'); } catch (_) {}
          await humanSleep(300);
          return true;
        }
      } catch (err) {
        dlog(`Ors yerlestirme denemesi basarisiz (${off}): ${err.message}`);
      }
    }
  }

  return false;
}

async function buyAnvilFromAh(token) {
  const bot = state.bot;
  const S = state.S || {};
  assertActive(token);
  closeWindowSafe();
  await humanSleep(400);

  const maxPrice = S.godHelmetMaxAnvilPrice || 500000;
  log(`Etrafta veya envanterde ors yok, /ah anvil pazarindan en ucuz ors araniyor (Tavan: $${maxPrice.toLocaleString()})...`);

  const winPromise = waitForWindow(CFG.marketWindowTimeoutMs);
  winPromise.catch(() => {});
  bot.chat('/ah anvil');

  let win;
  try {
    win = await winPromise;
  } catch (e) {
    throw new Error(`/ah anvil penceresi acilmadi: ${e.message}`);
  }
  assertActive(token);

  await humanSleep(CFG.marketReadDelayMs);
  const snap = snapshotWindow(bot.currentWindow || win);

  if (!snap) {
    closeWindowSafe();
    throw new Error('AH pencere slotlari okunamadi');
  }

  let lowestListing = null;
  for (let i = 0; i < snap.slots.length; i++) {
    const it = snap.slots[i];
    if (!it || !it.name.includes('anvil')) continue;
    for (const p of it.prices) {
      if (lowestListing === null || p.value < lowestListing.price) {
        lowestListing = { slot: i, price: p.value, name: it.name, display: it.display };
      }
    }
  }

  if (!lowestListing) {
    closeWindowSafe();
    throw new Error('/ah uzerinde satilik ors bulunamadi!');
  }

  if (lowestListing.price > maxPrice) {
    closeWindowSafe();
    throw new Error(`En ucuz ors ($${lowestListing.price.toLocaleString()}) belirlenen tavan fiyatin ($${maxPrice.toLocaleString()}) ustunde! Satin alma iptal edildi.`);
  }

  log(`En ucuz ors bulundu: ${lowestListing.display || lowestListing.name} - $${lowestListing.price.toLocaleString()} (Slot ${lowestListing.slot}). Satin aliniyor...`);

  const confirmPromise = waitForWindow(5000).catch(() => null);
  await bot.clickWindow(lowestListing.slot, 0, 0);

  const confirmWin = await confirmPromise;
  assertActive(token);

  if (confirmWin || (bot.currentWindow && bot.currentWindow !== win)) {
    const cur = bot.currentWindow || confirmWin;
    dlog(`AH Satin alma onay penceresi: "${titleOf(cur)}"`);
    await humanSleep(600);

    let confirmBtnSlot = CFG.ahConfirmSlot;
    if (cur.slots[confirmBtnSlot] && CFG.ahConfirmItemRegex.test(cur.slots[confirmBtnSlot].name)) {
      // confirm slot dogru
    } else {
      const greenSlot = cur.slots.findIndex((s, idx) => idx < cur.inventoryStart && s && CFG.ahConfirmItemRegex.test(s.name));
      if (greenSlot >= 0) confirmBtnSlot = greenSlot;
    }

    dlog(`Onay butonuna tiklaniyor: slot ${confirmBtnSlot}`);
    await bot.clickWindow(confirmBtnSlot, 0, 0);
    await humanSleep(1000);
  }

  // AH satin alma sonrasi sunucunun geri actigi veya acik kalan pencereleri tamamen kapat
  for (let c = 0; c < 3; c++) {
    closeWindowSafe();
    await humanSleep(350);
  }

  const hasAnvil = bot.inventory.items().some((i) => i.name.includes('anvil'));
  if (!hasAnvil) {
    throw new Error('Ors satin alindi fakat envanterde gorunmuyor!');
  }

  log(`Ors basariyla satin alindi: $${lowestListing.price.toLocaleString()}`);
  recordTransaction({
    type: 'EXPENSE',
    category: 'Örs',
    item: lowestListing.display || lowestListing.name || 'Anvil',
    amount: 1,
    unitPrice: lowestListing.price,
    total: lowestListing.price,
    note: `/ah üzerinden en ucuz örs satın alımı`,
  });
}

async function ensureAnvil(token) {
  assertActive(token);
  let anvilBlock = findAnvilBlock();
  if (anvilBlock) return anvilBlock;

  let placed = await placeAnvilFromInventory(token);
  if (placed) {
    anvilBlock = findAnvilBlock();
    if (anvilBlock) return anvilBlock;
  }

  await buyAnvilFromAh(token);
  placed = await placeAnvilFromInventory(token);
  if (!placed) {
    throw new Error('Ors satin alindi ancak yere yerlestirilemedi!');
  }

  anvilBlock = findAnvilBlock();
  if (!anvilBlock) {
    throw new Error('Yerlestirilen ors bloku bulunamadi!');
  }
  return anvilBlock;
}

function isAnvilWindow(win) {
  if (!win) return false;
  const title = (titleOf(win) || '').toLowerCase();
  const type = String(win.type || '').toLowerCase();
  return type.includes('anvil') || title.includes('repair') || title.includes('örs') || title.includes('ors');
}

// Örs bloğunu açar (önce açık pencereyi kontrol eder, boş elle sağ tıklar, gerekirse bot.openBlock dener)
async function openAnvilGUI(anvilBlock, token) {
  const bot = state.bot;
  assertActive(token);

  // 1. Zaten örs penceresi açıksa doğrudan kullan
  if (bot.currentWindow && isAnvilWindow(bot.currentWindow)) {
    dlog(`Örs penceresi zaten açık ("${titleOf(bot.currentWindow)}"), doğrudan kullanılıyor.`);
    return bot.currentWindow;
  }

  // 2. Açık olan başka bir GUI (AH, sandık vb.) varsa tamamen kapat
  while (bot.currentWindow) {
    dlog(`Örs açılmadan önce açık kalan pencere kapatılıyor: "${titleOf(bot.currentWindow)}"`);
    closeWindowSafe();
    await humanSleep(350);
  }

  // 3. Sneak kesinlikle kapalı olmalı
  bot.setControlState('sneak', false);

  // 4. Eli boşalt (eli boşken sağ tıklandığında sunucu blok etkileşimini %100 kabul eder)
  try {
    await bot.unequip('hand');
    await humanSleep(250);
  } catch (_) {}

  const anvilPos = anvilBlock.position;
  const lookTarget = anvilPos.offset(0.5, 0.8, 0.5);

  // 5. Örsü açmak için 3 deneme yap
  for (let attempt = 1; attempt <= 3; attempt++) {
    assertActive(token);
    log(`🔨 Örs açılıyor (deneme ${attempt}/3): ${anvilBlock.name} @ ${anvilPos}...`);

    await bot.lookAt(lookTarget, true);
    await humanSleep(250);

    const winPromise = waitForWindow(7000);
    winPromise.catch(() => {});

    try {
      await bot.activateBlock(anvilBlock, new Vec3(0, 1, 0), new Vec3(0.5, 1.0, 0.5));
    } catch (err) {
      dlog(`activateBlock hatasi: ${err.message}`);
    }

    try {
      const win = await winPromise;
      if (win && isAnvilWindow(win)) {
        log(`✅ Örs penceresi başarıyla açıldı ("${titleOf(win)}").`);
        return win;
      }
    } catch (_) {
      dlog(`Örs açılmadı, tekrar deneniyor (${attempt}/3)...`);
      await humanSleep(500);
    }
  }

  // Son çare: bot.openBlock
  log('Örs standart sağ tıklama ile açılmadı, bot.openBlock deneniyor...');
  return await bot.openBlock(anvilBlock);
}

// 3. Orste Iki Esyayi Birlestirme
async function combineInAnvil(findLeftItemFn, findRightItemFn, token) {
  const bot = state.bot;
  assertActive(token);

  const anvilBlock = await ensureAnvil(token);
  const curWin = await openAnvilGUI(anvilBlock, token);
  assertActive(token);
  await humanSleep(500);

  try {
    if (!curWin) throw new Error('Ors penceresi acilmadi!');

    // win.inventoryStart genellikle 3'tur (slot 0: Sol, slot 1: Sag, slot 2: Cikti)
    const invItems = curWin.slots.slice(curWin.inventoryStart);
    const leftItem = invItems.find((it) => it && findLeftItemFn(it));
    if (!leftItem) {
      throw new Error('Ors sol slotu icin uygun esya envanterde bulunamadi!');
    }
    const leftSlot = curWin.slots.indexOf(leftItem);

    dlog(`Sol esya yerlestiriliyor: ${leftItem.name} (Slot ${leftSlot} ➔ 0)`);
    await bot.clickWindow(leftSlot, 0, 0);
    await humanSleep(250);
    await bot.clickWindow(0, 0, 0);
    await humanSleep(350);

    const invItems2 = curWin.slots.slice(curWin.inventoryStart);
    const rightItem = invItems2.find((it) => it && findRightItemFn(it));
    if (!rightItem) {
      throw new Error('Ors sag slotu icin uygun esya/kitap envanterde bulunamadi!');
    }
    const rightSlot = curWin.slots.indexOf(rightItem);

    dlog(`Sag esya yerlestiriliyor: ${rightItem.name} (Slot ${rightSlot} ➔ 1)`);
    await bot.clickWindow(rightSlot, 0, 0);
    await humanSleep(250);
    await bot.clickWindow(1, 0, 0);
    await humanSleep(500);

    const outItem = await waitForSlot(2, 5000);
    if (!outItem) {
      throw new Error('Orste cikti olusmadi! (Yetersiz seviye veya uyumsuz esyalar)');
    }

    log(`🔨 Örs çıktısı hazır: ${outItem.displayName || outItem.name} (Slot 2). Envantere alınıyor...`);
    await bot.clickWindow(2, 0, 1); // shift-click
    await humanSleep(600);

    log(`✅ Örste birleştirildi: ${outItem.displayName || outItem.name}`);
    return true;
  } finally {
    closeWindowSafe();
    await humanSleep(300);
  }
}

module.exports = {
  ensureExperienceLevel,
  findAnvilBlock,
  placeAnvilFromInventory,
  buyAnvilFromAh,
  ensureAnvil,
  combineInAnvil,
};
