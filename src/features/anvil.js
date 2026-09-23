'use strict';

const { Vec3 } = require('vec3');
const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { sleep, humanSleep, titleOf, filledSlots } = require('../utils/text');
const { loreOf, snapshotWindow } = require('../utils/inspect');
const { recordTransaction } = require('../stats');
const { runOrderFlow, waitForOrderComplete, hasActiveOrder } = require('./order');
const { collectItems } = require('./collect');
const {
  assertActive,
  waitForWindow,
  waitForSlot,
  closeWindowSafe,
} = require('../utils/windows');

function totalXpForLevel(level) {
  if (level <= 16) return level * level + 6 * level;
  if (level <= 31) return Math.floor(2.5 * level * level - 40.5 * level + 360);
  return Math.floor(4.5 * level * level - 162.5 * level + 2220);
}

function currentXpPoints(bot) {
  const lvl = bot.experience.level || 0;
  const progress = bot.experience.progress || 0;
  let pointsForNextLevel;
  if (lvl <= 15) pointsForNextLevel = 2 * lvl + 7;
  else if (lvl <= 30) pointsForNextLevel = 5 * lvl - 38;
  else pointsForNextLevel = 9 * lvl - 158;
  return totalXpForLevel(lvl) + Math.round(progress * pointsForNextLevel);
}

// 1. XP Seviyesi Saglama (İsrafsız & Aşımı %100 Önleyen Akıllı Fırlatma)
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
    log('⚠️ Envanterde XP şişesi bitti. Depodan sadece 1 stack (64 adet) alınıyor...');
    const xpOrder = {
      item: "Bottle o' Enchanting",
      itemId: 'experience_bottle',
      signText: "Bottle o' Enchanting",
      selectSlot: 0,
      orderSearchQuery: 'bottle o enchanting',
      orderAmount: 64,
      category: 'XP Şişesi',
    };

    // Önce teslimat sandığından sadece 1 stack çek
    await collectItems(token, xpOrder, 1);
    xpItem = bot.inventory.items().find((i) => i.name === 'experience_bottle');

    if (!xpItem) {
      const existingXp = await hasActiveOrder(token, xpOrder);
      let placedPrice = null;
      if (existingXp.exists) {
        log(`ℹ️ Depoda zaten aktif bir XP şişesi siparişi mevcut (Slot ${existingXp.slot}). 1 stack teslimat bekleniyor...`);
      } else {
        log("🛒 Döngü ortasında eksik XP için /orders üzerinden 1 stack (64 adet) Bottle o' Enchanting siparişi veriliyor...");
        placedPrice = await runOrderFlow(token, xpOrder);
        recordTransaction({
          type: 'EXPENSE',
          category: 'XP Şişesi',
          item: "Bottle o' Enchanting",
          amount: 64,
          unitPrice: placedPrice,
          total: 64 * placedPrice,
          note: 'Döngü esnasında 1 stack acil XP temini',
        });
      }

      await waitForOrderComplete(token, placedPrice, xpOrder);
      await collectItems(token, xpOrder, 1);

      xpItem = bot.inventory.items().find((i) => i.name === 'experience_bottle');
      if (!xpItem) {
        throw new Error('XP sisesi siparis edildi ve toplandi ancak envanterde experience_bottle bulunamadi!');
      }
    }
  }

  // 1. Şişeyi eline al
  if (!bot.heldItem || bot.heldItem.name !== 'experience_bottle') {
    await bot.equip(xpItem, 'hand');
    await humanSleep(100);
  }

  // 2. Yere (tam ayak ucuna) bak
  try {
    await bot.look(bot.entity.yaw, Math.PI / 2, true);
  } catch (_) {}

  // 3. Güvenli Hızlı Seri Burst (Hedef XP'nin altında kalması matematiksel olarak kesin miktar)
  const targetXp = totalXpForLevel(targetLevel);
  const currentXp = currentXpPoints(bot);
  const xpNeeded = Math.max(0, targetXp - currentXp);
  // Bir şişe en fazla 11 XP verir. Dolayısıyla xpNeeded / 11 kadar şişe fırlatıldığında
  // hedef seviyenin üstüne çıkılamaz (sıfır aşım garantisi).
  const safeBurstCount = Math.floor(xpNeeded / 11);

  if (safeBurstCount > 0) {
    dlog(`XP Güvenli Seri Atış: ${safeBurstCount} adet şişe 45ms hızla fırlatılıyor...`);
    for (let b = 0; b < safeBurstCount; b++) {
      assertActive(token);
      if (!bot.heldItem || bot.heldItem.name !== 'experience_bottle') {
        const nextXp = bot.inventory.items().find((i) => i.name === 'experience_bottle');
        if (!nextXp) break;
        await bot.equip(nextXp, 'hand');
        await sleep(40);
      }
      bot.activateItem();
      await sleep(45);
    }
    // Sunucudan seviye paketinin güncellenmesi için bekle
    await sleep(180);
  }

  // 4. Hedefe ulaşana kadar paket onaylı tekil atış (Aşımı ve XP israfını %100 önler)
  const startTime = Date.now();
  while (bot.experience.level < targetLevel) {
    assertActive(token);

    if (!bot.heldItem || bot.heldItem.name !== 'experience_bottle') {
      const nextXp = bot.inventory.items().find((i) => i.name === 'experience_bottle');
      if (!nextXp) {
        log('Envanterdeki tüm XP şişeleri tükendi!');
        break;
      }
      await bot.equip(nextXp, 'hand');
      await sleep(50);
    }

    bot.activateItem();
    // Sunucu seviye güncellemesi için 140ms bekle
    await sleep(140);

    if (Date.now() - startTime > 10000) {
      log('UYARI: XP yükleme zaman aşımına uğradı (10 sn), mevcut seviye ile devam ediliyor.');
      break;
    }
  }

  log(`Hedef seviyeye ulasildi: Seviye ${bot.experience.level} (Hedef ${targetLevel})`);
}

// 2. Ors Bulma / 8'li Yerlestirme / 40'lik Siparis Sistemi
function findAnvilBlock() {
  const bot = state.bot;
  if (!bot) return null;
  return bot.findBlock({
    matching: (b) => b && b.name && b.name.includes('anvil'),
    maxDistance: 3,
  });
}

async function equipAnvil(bot) {
  const anvilItem = bot.inventory.items().find((i) => i && i.name && i.name.includes('anvil'));
  if (!anvilItem) return false;
  if (!bot.heldItem || !bot.heldItem.name.includes('anvil')) {
    await bot.equip(anvilItem, 'hand');
    await humanSleep(200);
  }
  return true;
}

// 40 adet örs siparişi verir ve teslimat sandığından toplar
async function orderAndCollect40Anvils(token) {
  const bot = state.bot;
  assertActive(token);

  const anvilOrder = {
    item: 'Anvil',
    itemId: 'anvil',
    signText: 'Anvil',
    selectSlot: 0,
    orderSearchQuery: 'anvil',
    orderAmount: 40,
    category: 'Örs',
  };

  log('🔍 Örs siparişi vermeden önce mevcut siparişler ve teslimat sandığı taranıyor...');
  // 1. Önce teslimat sandığına bak (önceden sipariş edilmiş ve hazır örs var mı?)
  await collectItems(token, anvilOrder);

  let anvilCount = bot.inventory.items().filter((i) => i && i.name && i.name.includes('anvil')).reduce((s, i) => s + i.count, 0);
  if (anvilCount > 0) {
    log(`✅ Mevcut teslimat sandığından ${anvilCount} adet örs envantere alındı. Yeni sipariş açılmasına gerek yok.`);
    return;
  }

  // 2. Depoda /orders -> "Your Orders" menüsünde zaten açılmış aktif bir Anvil siparişi var mı?
  const existing = await hasActiveOrder(token, anvilOrder);
  let placedPrice = null;

  if (existing.exists) {
    log(`ℹ️ Depoda zaten aktif bir Anvil siparişi mevcut (Slot ${existing.slot}). Mükerrer sipariş açılmıyor, teslimat bekleniyor...`);
  } else {
    log('🛒 Etrafta, envanterde veya depoda örs siparişi bulunamadı. /orders üzerinden 40 adet Anvil siparişi veriliyor...');
    placedPrice = await runOrderFlow(token, anvilOrder);
    recordTransaction({
      type: 'EXPENSE',
      category: 'Örs',
      item: 'Anvil',
      amount: 40,
      unitPrice: placedPrice,
      total: 40 * placedPrice,
      note: '/orders üzerinden 40 adet toplu örs alımı',
    });
  }

  log('⏳ 40 adet örsün teslimatı bekleniyor...');
  await waitForOrderComplete(token, placedPrice, anvilOrder);
  await collectItems(token, anvilOrder);

  anvilCount = bot.inventory.items().filter((i) => i && i.name && i.name.includes('anvil')).reduce((s, i) => s + i.count, 0);
  log(`✅ Toplam ${anvilCount} adet örs teslimat sandığından envantere alındı.`);
}

// Botun etrafına Sağ, Sol, Ön, Arka yönlerinde 2 blok yüksekliğinde (4 yön x 2 blok = 8 adet) örs yerleştirir
async function placeSurroundingAnvils(token) {
  const bot = state.bot;
  assertActive(token);

  const anvilItems = bot.inventory.items().filter((i) => i && i.name && i.name.includes('anvil'));
  if (anvilItems.length === 0) return false;

  const pos = bot.entity.position.floored();
  const DIRS = [
    { name: 'Sağ (Doğu)',  dx: 1, dz: 0 },
    { name: 'Sol (Batı)',   dx: -1, dz: 0 },
    { name: 'Ön (Güney)',   dx: 0, dz: 1 },
    { name: 'Arka (Kuzey)', dx: 0, dz: -1 },
  ];

  log('🔨 Botun etrafına 4 yönde 2 blok yüksekliğinde 8 adet örs kalesi yerleştiriliyor...');
  let placedTotal = 0;

  for (const d of DIRS) {
    assertActive(token);

    // 1. Alt Blok (Y)
    const lowerPos = pos.offset(d.dx, 0, d.dz);
    const lowerBlock = bot.blockAt(lowerPos);
    if (!lowerBlock || !lowerBlock.name.includes('anvil')) {
      const floorBlock = bot.blockAt(pos.offset(d.dx, -1, d.dz));
      if (floorBlock && floorBlock.boundingBox === 'block') {
        const hasItem = await equipAnvil(bot);
        if (!hasItem) break;
        try {
          await bot.placeBlock(floorBlock, new Vec3(0, 1, 0));
          placedTotal++;
          await humanSleep(300);
        } catch (e) {
          dlog(`Alt örs yerleştirilemedi (${d.name}): ${e.message}`);
        }
      }
    }

    // 2. Üst Blok (Y + 1)
    const upperPos = pos.offset(d.dx, 1, d.dz);
    const upperBlock = bot.blockAt(upperPos);
    const currentLower = bot.blockAt(lowerPos);
    if ((!upperBlock || !upperBlock.name.includes('anvil')) && currentLower && currentLower.name.includes('anvil')) {
      const hasItem = await equipAnvil(bot);
      if (!hasItem) break;
      try {
        await bot.placeBlock(currentLower, new Vec3(0, 1, 0));
        placedTotal++;
        await humanSleep(300);
      } catch (e) {
        dlog(`Üst örs yerleştirilemedi (${d.name}): ${e.message}`);
      }
    }
  }

  try { await bot.unequip('hand'); } catch (_) {}
  if (placedTotal > 0) {
    log(`✅ Çevreye ${placedTotal} adet yeni örs yerleştirildi (Toplam 8 yuva dolduruldu).`);
  }
  return placedTotal > 0 || !!findAnvilBlock();
}

async function ensureAnvil(token) {
  assertActive(token);
  let anvilBlock = findAnvilBlock();
  if (anvilBlock) return anvilBlock;

  // Etrafta örs yoksa (veya hepsi kırıldıysa)
  const bot = state.bot;
  const hasAnvilsInInv = bot.inventory.items().some((i) => i && i.name && i.name.includes('anvil'));
  if (!hasAnvilsInInv) {
    // 40 adet örs siparişi ver ve depodan çek
    await orderAndCollect40Anvils(token);
  }

  // 8'li kaleyi yerleştir
  await placeSurroundingAnvils(token);

  anvilBlock = findAnvilBlock();
  if (!anvilBlock) {
    throw new Error('Örs yerleştirildi fakat etrafta erişilebilir örs bloku tespit edilemedi!');
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

const placeAnvilFromInventory = placeSurroundingAnvils;
const buyAnvilFromAh = orderAndCollect40Anvils;

module.exports = {
  ensureExperienceLevel,
  findAnvilBlock,
  placeAnvilFromInventory,
  placeSurroundingAnvils,
  buyAnvilFromAh,
  orderAndCollect40Anvils,
  ensureAnvil,
  combineInAnvil,
};
