'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats, recordTransaction, recordRefund } = require('../stats');
const { sleep, humanSleep, titleOf } = require('../utils/text');
const { snapshotWindow, displayOf, loreOf, extractItemEnchantments, matchesItemOrder } = require('../utils/inspect');
const {
  assertActive,
  waitForWindow,
  waitForSignEditor,
  submitSign,
  safeClick,
  closeWindowSafe,
  executeCommandWindow,
} = require('../utils/windows');

// Siparis menusu adimlari (slot numaralari Donut SMP'de dogrulandi)
function buildSteps(orderPrice, itemOverride) {
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : state.S);
  const signText = itemCfg.signText || itemCfg.item;

  const steps = [
    { name: 'Siparis menusu',   type: 'CLICK', slot: 51, expectWindow: true },
    { name: 'Alt menu',         type: 'CLICK', slot: 8,  expectWindow: true },
    { name: 'Kategori',         type: 'CLICK', slot: 12, expectWindow: true },
    { name: 'Item arama',       type: 'SIGN',  slot: 50, text: signText },
    { name: 'Item secimi',      type: 'ITEM_SELECT' },
    { name: 'Miktar',           type: 'SIGN',  slot: 13, text: String(itemCfg.orderAmount) },
    { name: 'Fiyat',            type: 'SIGN',  slot: 14, text: String(orderPrice) },
    { name: 'Siparis onayi',    type: 'CLICK', slot: 16, expectWindow: false }
  ];

  return steps;
}

// /order <itemId> veya /order enchanted book <büyü> panosunu acar
async function fetchOrderReferencePrice(token, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  assertActive(token);

  const query = itemCfg.orderSearchQuery || itemCfg.item || itemCfg.itemId;
  const cmd = `${S.orderSearchCmd} ${query}`.trim();
  dlog(`Siparis referans fiyati sorgulaniyor: ${cmd}`);

  let win;
  try {
    win = await executeCommandWindow(cmd, CFG.marketWindowTimeoutMs, 3);
  } catch (e) {
    log(`UYARI: Siparis panosu penceresi acilamadi (${e.message}).`);
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

// Siparis panosundaki en yuksek fiyatin uzerine cikip siparis fiyatini dinamik belirler.
// Büyü basılabilen eşyalar hariç daima /orders panosundan canlı fiyat çeker.
async function computeOrderPrice(token, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  
  // Büyü basılabilen eşyalar / kitaplar veya kullanıcı tarafından sabit/manuel fiyat belirlenen eşyalar (örn: Elmas Kask)
  const isEnchantException = itemCfg.isEnchantException || itemCfg.targetEnchant || itemCfg.itemId === 'enchanted_book';
  if ((itemCfg.fixedPrice && itemCfg.orderPrice) || isEnchantException) {
    const label = isEnchantException ? '📜 Büyülü eşya istisnası' : '🛡️ Sabit/Manuel fiyat';
    log(`${label} devrede: ${itemCfg.item || itemCfg.itemId} için belirlenen fiyat: $${Number(itemCfg.orderPrice).toLocaleString()}`);
    return itemCfg.orderPrice;
  }

  // Normal eşyalar: Canlı /orders panosundan çekilmek ZORUNDADIR (yedek fiyat yok)
  const highest = await fetchOrderReferencePrice(token, itemOverride);
  let price;
  if (highest === null) {
    const initialBid = itemCfg.initialBid || itemCfg.minOrderPrice || 100;
    log(`ℹ️ /orders panosunda ${itemCfg.item || itemCfg.itemId} için aktif alım emri bulunamadı. Başlangıç teklifi ($${initialBid.toLocaleString()}) veriliyor.`);
    price = initialBid;
  } else {
    const markup = itemCfg.orderMarkup !== undefined ? itemCfg.orderMarkup : (S.orderMarkup || 100);
    price = Math.round(highest + markup);
    log(`🎯 /orders panosu tarandı: En yüksek teklif $${highest.toLocaleString()} ➔ Yeni sipariş fiyatı: $${price.toLocaleString()} (+${markup})`);
  }

  if (price < 1) price = 1;
  const maxPrice = itemCfg.maxOrderPrice !== undefined ? itemCfg.maxOrderPrice : (S.maxOrderPrice || 1000000000000);
  if (price > maxPrice) {
    log(`UYARI: hesaplanan siparis fiyati ($${price.toLocaleString()}) tavani ($${maxPrice.toLocaleString()}) asiyor, tavana cekildi.`);
    price = maxPrice;
  }
  return price;
}

// Aktif siparisi /orders menusunden iptal eder ve parayi iade alir
async function cancelActiveOrder(token, itemOverride) {
  const bot = state.bot;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : state.S);
  log(`Aktif siparis iptal ediliyor: ${itemCfg.item}...`);
  assertActive(token);

  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);
  assertActive(token);

  // Slot 51: Your Orders menusu
  await safeClick(51);
  const win = await waitForWindow();
  assertActive(token);

  // Penceredeki hedeflenen siparis slotunu bul
  let orderSlot = null;
  for (let i = 0; i < win.inventoryStart; i++) {
    const it = win.slots[i];
    if (it && matchesItemOrder(itemCfg, it)) {
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
    if (itemCfg.orderPrice && itemCfg.orderAmount) {
      recordRefund({
        category: itemCfg.category || 'Malzeme Alımı',
        item: itemCfg.item || itemCfg.itemId,
        amount: itemCfg.orderAmount,
        unitPrice: itemCfg.orderPrice,
        total: itemCfg.orderAmount * itemCfg.orderPrice,
        note: `İptal edilen sipariş iadesi: ${itemCfg.item || itemCfg.itemId}`,
      });
    }
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

// Eger secilen item buyulenebiliyorsa acilan ekranda direk 52. slota basar
async function handlePickEnchantments(token, itemCfg) {
  const bot = state.bot;
  assertActive(token);
  const win = bot.currentWindow;
  if (!win) return;

  log(`✨ Büyülenebilir eşya ekranı algılandı ("${titleOf(win)}"). Doğrudan 52. slota basılıyor...`);
  await humanSleep(350);

  const nextWinPromise = waitForWindow(5000).catch(() => null);
  try {
    await safeClick(52);
  } catch (err) {
    log(`safeClick(52) uyarısı: ${err.message}, doğrudan clickWindow(52) gönderiliyor...`);
    await bot.clickWindow(52, 0, 0);
  }
  const nextWin = await nextWinPromise;
  await humanSleep(400);

  if (nextWin || bot.currentWindow) {
    log(`Büyü ekranı geçildi, sipariş penceresi açıldı: "${titleOf(bot.currentWindow || nextWin)}"`);
  }
}

// Arama sonuclari penceresindeki bir esyanin siparis hedefiyle eslesip eslesmedigini dogrular
function matchOrderItem(it, itemCfg) {
  if (!it || !it.name) return false;
  if (it.name.includes('glass') || it.name === 'barrier' || it.name === 'arrow' || it.name === 'bedrock') return false;

  const displayName = (it.displayName || '').toLowerCase();
  const loreText = (loreOf(it) || []).join(' ').toLowerCase();
  const fullText = `${it.name} ${displayName} ${loreText}`;

  // 1. Enchanted Book ise: Kesin büyü ve seviye dogrulamasi
  if (it.name === 'enchanted_book') {
    const rawEnchants = extractItemEnchantments(it);
    const targetEnchant = itemCfg.targetEnchant;
    const targetName = (itemCfg.item || '').toLowerCase();

    // Mending: Kesinlikle Mending olmali, Curse veya baska büyü olmamali
    if (targetEnchant === 'mending' || targetName.includes('mending')) {
      const hasMending = rawEnchants.some((e) => e.name === 'mending') || fullText.includes('mending');
      const isCurse = fullText.includes('vanishing') || fullText.includes('binding') || rawEnchants.some((e) => e.name.includes('curse'));
      return hasMending && !isCurse;
    }

    // Respiration 3: Respiration III / 3 olmali, Riptide olmamali
    if (targetEnchant === 'resp_3' || targetName.includes('respiration')) {
      const hasResp = rawEnchants.some((e) => e.name === 'respiration' && Number(e.lvl) >= 3) ||
                      (fullText.includes('respiration') && (fullText.includes('iii') || fullText.includes(' 3')));
      const isRiptide = fullText.includes('riptide') || rawEnchants.some((e) => e.name === 'riptide');
      return hasResp && !isRiptide;
    }

    // Unbreaking 3: Unbreaking III / 3 olmali, Multishot olmamali
    if (targetEnchant === 'unbreaking_3' || targetName.includes('unbreaking')) {
      const hasUnb = rawEnchants.some((e) => e.name === 'unbreaking' && Number(e.lvl) >= 3) ||
                     (fullText.includes('unbreaking') && (fullText.includes('iii') || fullText.includes(' 3')));
      const isMultishot = fullText.includes('multishot') || rawEnchants.some((e) => e.name === 'multishot');
      return hasUnb && !isMultishot;
    }

    // Blast Protection 4:
    if (targetEnchant === 'blast_prot_4' || targetName.includes('blast protection')) {
      return rawEnchants.some((e) => e.name === 'blast_protection' && Number(e.lvl) >= 4) ||
             (fullText.includes('blast') && (fullText.includes('iv') || fullText.includes(' 4')));
    }

    // Aqua Affinity:
    if (targetEnchant === 'aqua_affinity' || targetName.includes('aqua affinity')) {
      return rawEnchants.some((e) => e.name === 'aqua_affinity') || fullText.includes('aqua affinity');
    }

    if (itemCfg.matchLore && fullText.includes(itemCfg.matchLore.toLowerCase())) {
      return true;
    }
    return false;
  }

  // 2. Normal eşyalar (diamond_helmet, experience_bottle vb.)
  if (itemCfg.itemId && it.name === itemCfg.itemId) return true;
  if (itemCfg.item && (displayName.includes(itemCfg.item.toLowerCase()) || it.name.includes(itemCfg.itemId || ''))) return true;

  return false;
}

// Arama sonuclari penceresinde sayfalari ve slotlari dinamik tarayip dogru esyaya tiklar
async function selectOrderItem(token, itemCfg) {
  const bot = state.bot;
  assertActive(token);

  await humanSleep(500);
  let win = bot.currentWindow;
  if (!win) throw new Error('Arama sonuç penceresi açık değil');

  // Slotların yüklenmesi için bekle (en fazla 3.5 sn)
  const startWait = Date.now();
  while (Date.now() - startWait < 3500) {
    win = bot.currentWindow || win;
    const hasAnyItem = win && win.slots && win.slots.slice(0, win.inventoryStart).some(
      (it) => it && !it.name.includes('glass') && it.name !== 'barrier'
    );
    if (hasAnyItem) break;
    await sleep(150);
  }
  win = bot.currentWindow || win;

  let targetSlot = -1;
  let targetItem = null;

  // 1. Mevcut sayfayı tara
  for (let s = 0; s < win.inventoryStart; s++) {
    const it = win.slots[s];
    if (matchOrderItem(it, itemCfg)) {
      targetSlot = s;
      targetItem = it;
      break;
    }
  }

  // 2. Bulunamadıysa sonraki sayfalara geç (slot 53 arrow ise)
  if (targetSlot === -1) {
    for (let page = 2; page <= 5; page++) {
      const curWin = bot.currentWindow;
      if (!curWin) break;
      const nextArrow = curWin.slots[53];
      if (!nextArrow || (nextArrow.name !== 'arrow' && !(nextArrow.displayName && nextArrow.displayName.toLowerCase().includes('next')))) {
        break;
      }

      dlog(`Sayfa 1'de "${itemCfg.item}" bulunamadı, sayfa ${page}'ye geçiliyor (slot 53)...`);
      const nextWinPromise = waitForWindow(3000).catch(() => null);
      await safeClick(53);
      await nextWinPromise;
      await humanSleep(500);

      const pWin = bot.currentWindow;
      if (!pWin) break;

      for (let s = 0; s < pWin.inventoryStart; s++) {
        const it = pWin.slots[s];
        if (matchOrderItem(it, itemCfg)) {
          targetSlot = s;
          targetItem = it;
          break;
        }
      }
      if (targetSlot !== -1) break;
    }
  }

  // 3. Hala bulunamadıysa yedek selectSlot (varsa)
  if (targetSlot === -1 && itemCfg.selectSlot !== undefined) {
    targetSlot = itemCfg.selectSlot;
    log(`⚠️ Dinamik taramada eşya bulunamadı, varsayılan slot ${targetSlot} deneniyor.`);
  }

  if (targetSlot === -1) {
    throw new Error(`Arama sonuçlarında hedeflenen eşya ("${itemCfg.item}") bulunamadı!`);
  }

  const desc = targetItem ? `${targetItem.name} (${targetItem.displayName || ''})` : `Slot ${targetSlot}`;
  log(`🎯 Sipariş edilecek eşya seçildi: Slot ${targetSlot} ➔ ${desc}`);

  const nextWinPromise = waitForWindow(4000).catch(() => null);
  await safeClick(targetSlot);
  await nextWinPromise;
  await humanSleep(400);

  // Eger eşya seçimi sonrası ara ekran (örn: Pick Enchantments) açıldıysa:
  if (bot.currentWindow) {
    const title = (titleOf(bot.currentWindow) || '').toLowerCase();
    if (title.includes('enchant') || (!title.includes('new order') && !title.includes('your orders'))) {
      await handlePickEnchantments(token, itemCfg);
    }
  }
}

async function runOrderFlow(token, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  const bot = state.bot;
  if (state.resetOrderCompletion) {
    state.resetOrderCompletion(itemCfg);
  } else {
    state.orderComplete = false;
  }

  closeWindowSafe();
  await humanSleep(400);

  const orderPrice = await computeOrderPrice(token, itemOverride);
  assertActive(token);

  const steps = buildSteps(orderPrice, itemOverride);
  log(`Siparis veriliyor: ${itemCfg.orderAmount}x ${itemCfg.item} @ $${orderPrice}`);

  await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    assertActive(token);
    dlog(`Adim ${i + 1}/${steps.length}: ${step.name}`);

    try {
      if (step.type === 'ITEM_SELECT') {
        await selectOrderItem(token, itemCfg);
      }

      if (step.type === 'CLICK') {
        const nextWin = step.expectWindow ? waitForWindow() : null;
        if (nextWin) nextWin.catch(() => {});
        await safeClick(step.slot);
        if (nextWin) await nextWin;

        // Eger item secimi yapildiysa ve farkli bir ekran (büyü secim ekrani vb.) acildiysa:
        if (step.isItemSelect && bot.currentWindow) {
          const title = (titleOf(bot.currentWindow) || '').toLowerCase();
          if (title.includes('enchant') || (!title.includes('new order') && !title.includes('your orders'))) {
            await handlePickEnchantments(token, itemCfg);
          }
        }
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

  log(`Siparis verildi: ${itemCfg.orderAmount}x ${itemCfg.item} @ $${orderPrice}`);
  bumpStats({ ordersPlaced: 1, itemsOrdered: itemCfg.orderAmount });
  recordTransaction({
    type: 'EXPENSE',
    category: itemCfg.category || 'Malzeme Alımı',
    item: itemCfg.item || itemCfg.itemId,
    amount: itemCfg.orderAmount,
    unitPrice: orderPrice,
    total: itemCfg.orderAmount * orderPrice,
    note: `/orders üzerinden ${itemCfg.orderAmount}x ${itemCfg.item || itemCfg.itemId} alımı`,
  });
  return orderPrice;
}

// Siparisin tamamlanmasini bekler. Outbid olursa veya sure asilirsa iptal edip bilgi dondurur.
async function waitForOrderComplete(token, placedPrice, itemOverride) {
  const S = state.S;
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : S);
  const timeoutMs = Math.max(1, S.orderTimeoutMin || 10) * 60 * 1000;
  const checkIntervalMs = Math.max(10, S.outbidCheckIntervalSec || 60) * 1000;

  const itemName = itemCfg.item || itemCfg.itemId || 'Item';
  log(`Siparisin tamamlanmasi bekleniyor: ${itemCfg.orderAmount}x ${itemName} (maks ${S.orderTimeoutMin || 10} dk, outbid kontrolu: ${S.outbidCheckIntervalSec || 60} sn)...`);

  const start = Date.now();
  let lastOutbidCheck = Date.now();

  while (true) {
    assertActive(token);

    // 1. Eşyaya özel tamamlanma kontrolü
    if (state.isOrderCompletedFor ? state.isOrderCompletedFor(itemCfg, start) : state.orderComplete) {
      log(`✅ Siparis tamamlandi: ${itemName}`);
      return { completed: true };
    }

    const elapsed = Date.now() - start;

    // 2. Zaman asimi kontrolu
    if (elapsed > timeoutMs) {
      log(`⏱️ SURE DOLDU: Siparis ${S.orderTimeoutMin || 10} dakika icinde tamamlanmadi. Siparis iptal ediliyor...`);
      await cancelActiveOrder(token, itemOverride);
      return { completed: false, reason: 'timeout' };
    }

    // 3. Outbid (onumuze gecilme) kontrolu
    if (S.autoOutbidRelist && placedPrice && !itemCfg.fixedPrice && (Date.now() - lastOutbidCheck >= checkIntervalMs)) {
      lastOutbidCheck = Date.now();
      try {
        const highest = await fetchOrderReferencePrice(token, itemOverride);
        if (highest !== null && highest > placedPrice) {
          const diff = highest - placedPrice;
          log(`⚠️ ONUMUZE GECILDI! Biri $${highest.toLocaleString()} fiyatiyla ($${diff.toLocaleString()} daha yuksek) siparis verdi!`);
          log(`Eski siparis iptal edilip yeni fiyattan acilacak...`);
          await cancelActiveOrder(token, itemOverride);
          return { completed: false, reason: 'outbid', newHighest: highest };
        }
      } catch (err) {
        dlog(`Outbid kontrol hatasi: ${err.message}`);
      }
    }

    await sleep(500);
  }
}

// /orders -> 51 (Your Orders) menusunde hedeflenen esyanin aktif siparisinin olup olmadigini kontrol eder
async function hasActiveOrder(token, itemOverride) {
  const itemCfg = itemOverride || (state.getActiveItem ? state.getActiveItem() : state.S);
  assertActive(token);
  closeWindowSafe();
  await humanSleep(300);

  try {
    await executeCommandWindow('/orders', CFG.windowTimeoutMs, 2);
    assertActive(token);

    // Slot 51: Your Orders menusu
    const yourOrdersPromise = waitForWindow();
    yourOrdersPromise.catch(() => {});
    await safeClick(51);
    const win = await yourOrdersPromise;
    await humanSleep(300);

    for (let i = 0; i < win.inventoryStart; i++) {
      const it = win.slots[i];
      if (it && matchesItemOrder(itemCfg, it)) {
        closeWindowSafe();
        await humanSleep(200);
        return { exists: true, slot: i, item: it };
      }
    }
    closeWindowSafe();
    await humanSleep(200);
    return { exists: false };
  } catch (err) {
    dlog(`hasActiveOrder hatasi: ${err.message}`);
    closeWindowSafe();
    return { exists: false };
  }
}

// Eski veya ozel cagrilari runOrderFlow'a yonlendir
async function runCustomOrderFlow(itemName, amount, price, token) {
  return await runOrderFlow(token, {
    item: itemName,
    itemId: itemName.toLowerCase().replace(/\s+/g, '_'),
    orderAmount: amount,
    orderPrice: price,
  });
}

module.exports = {
  buildSteps,
  fetchOrderReferencePrice,
  computeOrderPrice,
  cancelActiveOrder,
  hasActiveOrder,
  runOrderFlow,
  runCustomOrderFlow,
  waitForOrderComplete,
};
