'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { bumpStats, recordListing, recordSale } = require('../stats');
const { sleep, humanSleep, titleOf, filledSlots } = require('../utils/text');
const {
  assertActive,
  waitForWindow,
  itemCount,
  closeWindowSafe,
  isConfirmWindow,
} = require('../utils/windows');
const { fetchLowestListingPrice, computeSellPrice } = require('./market');

function normalizeNum(raw) {
  let s = String(raw || '').trim().replace(/\s/g, '');
  if (!s) return null;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot > lastComma) s = s.replace(/,/g, '');
    else s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) s = s.replace(/\./g, '');
    else {
      const parts = s.split('.');
      if (parts[1] && parts[1].length === 3) s = s.replace('.', '');
    }
  } else if (hasComma) {
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1) s = s.replace(/,/g, '');
    else {
      const parts = s.split(',');
      if (parts[1] && parts[1].length === 3) s = s.replace(',', '');
      else s = s.replace(',', '.');
    }
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}

// Chat veya actionbar mesajından açık artırma satış bildirimini ayrıştırır
function parseSaleMessage(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .trim();

  if (CFG.listedRegex.test(text) || /you listed/i.test(text)) return null;
  if (/order.*(?:complete|fulfilled|finished)/i.test(text)) return null;

  const patterns = [
    /(?:\[auction\]|\[ah\])?\s*(?:someone|\S+)\s+(?:bought|purchased)\s+your\s+(?:(\d+)x?\s+)?(.+?)\s+for\s+\$?\s*([\d,.\s]+)/i,
    /you\s+sold\s+(?:(\d+)x?\s+)?(.+?)\s+(?:to\s+\S+\s+)?for\s+\$?\s*([\d,.\s]+)/i,
    /your\s+auction\s+(?:of|for)?\s+(?:(\d+)x?\s+)?(.+?)\s+(?:has\s+been\s+sold|was\s+bought|was\s+purchased)\s+(?:by\s+\S+\s+)?(?:for\s+)?\$?\s*([\d,.\s]+)/i,
    /(?:bought|sold|purchased)\s+.*?\bfor\s+\$?\s*([\d,.\s]+)/i,
  ];

  for (const pat of patterns) {
    const m = pat.exec(text);
    if (m) {
      if (m.length >= 4) {
        const qty = m[1] ? parseInt(m[1], 10) : 1;
        let item = m[2] ? m[2].trim() : 'Eşya';
        item = item.replace(/^(?:auction\s+of|auction\s+for)\s+/i, '').trim();
        const price = normalizeNum(m[3]);
        return { item, amount: qty, price };
      } else if (m.length >= 2) {
        const price = normalizeNum(m[1]);
        return { item: 'Eşya', amount: 1, price };
      }
    }
  }

  const S = state.S || {};
  const soldRegex = S.soldRegex ? new RegExp(S.soldRegex, 'i') : /\b(sold|purchased|bought)\b/i;
  if (soldRegex.test(text)) {
    return { item: 'Eşya', amount: 1, price: null };
  }

  return null;
}

// Chat mesaji bir ilan satisi mi?
function isSaleMessage(m) {
  return parseSaleMessage(m) !== null;
}

// Ele, en fazla maxBatch adetlik bir stack alir. Ele alinan adedi dondurur (0 = item yok).
async function prepareStackAndHold(maxBatch) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  const bot = state.bot;
  const stacks = bot.inventory.items().filter((i) => i.name === itemCfg.itemId);
  if (stacks.length === 0) return 0;

  const total = stacks.reduce((sum, i) => sum + i.count, 0);
  let target = Math.min(maxBatch, total);
  let chosen = stacks.find((i) => i.count === target);

  if (!chosen) {
    const src = stacks
      .filter((i) => i.count > target)
      .sort((a, b) => a.count - b.count)[0];

    if (src) {
      const emptyIdx = bot.inventory.slots.findIndex((it, i) => i >= 9 && i <= 44 && !it);
      if (emptyIdx < 0) throw new Error('stack bolmek icin bos envanter slotu yok');

      await bot.clickWindow(src.slot, 0, 0);
      await humanSleep(250);
      for (let k = 0; k < target; k++) {
        await bot.clickWindow(emptyIdx, 1, 0);
        await humanSleep(200);
      }
      await bot.clickWindow(src.slot, 0, 0);
      await humanSleep(500);

      chosen = bot.inventory.slots[emptyIdx];
      if (!chosen || chosen.name !== itemCfg.itemId || chosen.count !== target) {
        throw new Error(`${target} adetlik stack ayrilamadi`);
      }
    } else {
      chosen = stacks.sort((a, b) => b.count - a.count)[0];
      target = chosen.count;
      dlog(`Tam ${maxBatch} adetlik stack yok, ${target} adet satilacak`);
    }
  }

  await bot.equip(chosen, 'hand');
  await humanSleep(CFG.holdSyncMs);

  const held = bot.heldItem;
  if (!held || held.name !== itemCfg.itemId || held.count !== target) {
    throw new Error(`ele ${target} adet ${itemCfg.itemId} alinamadi (elde: ${held ? `${held.name} x${held.count}` : 'hicbir sey'})`);
  }
  return target;
}

// Tek bir ilan olusturur. Satilan adedi dondurur (0 = item kalmadi).
async function sellOne(token, maxBatch, sellPrice) {
  const bot = state.bot;
  for (let attempt = 1; attempt <= CFG.spamMaxRetries; attempt++) {
    assertActive(token);
    closeWindowSafe();

    const qty = await prepareStackAndHold(maxBatch);
    if (!qty) return 0;

    if (CFG.closeInvBeforeCmd) {
      try { bot._client.write('close_window', { windowId: 0 }); } catch (_) {}
      await sleep(300);
    }

    const before = itemCount();
    state.spamSeen = false;
    state.listedSeen = false;

    const winPromise = waitForWindow(CFG.confirmWaitMs);
    winPromise.catch(() => {});

    const cmd = `/ah sell ${sellPrice}`;
    dlog(`Komut: ${cmd} (${qty} adet, deneme ${attempt}/${CFG.spamMaxRetries})`);
    const t0 = Date.now();
    bot.chat(cmd);

    let win = null;
    try { win = await winPromise; } catch (_) { win = null; }
    assertActive(token);

    if (win) {
      dlog(`Onay penceresi ${Date.now() - t0} ms sonra acildi`);
      const cur0 = bot.currentWindow || win;
      dlog(`Ham pencere basligi: "${titleOf(cur0)}"`);

      if (!isConfirmWindow(cur0)) {
        log(`Beklenmeyen pencere "${titleOf(cur0)}" (${filledSlots(cur0)}), atlandi.`);
        closeWindowSafe();
        await sleep(1500);
        continue;
      }

      await sleep(CFG.ahConfirmDelayMs);
      assertActive(token);

      const cur = bot.currentWindow;
      const btn = cur && cur.slots[CFG.ahConfirmSlot];
      if (!btn || !CFG.ahConfirmItemRegex.test(btn.name)) {
        log(`Slot ${CFG.ahConfirmSlot} onay dugmesi degil (${btn ? btn.name : 'bos'}). Dolu slotlar: ${cur ? filledSlots(cur) : 'pencere yok'}`);
        closeWindowSafe();
        throw new Error('onay dugmesi dogrulanamadi');
      }

      await bot.clickWindow(CFG.ahConfirmSlot, 0, 0);

      const start = Date.now();
      while (Date.now() - start < CFG.sellVerifyMs) {
        assertActive(token);
        await sleep(250);
        if (state.listedSeen || itemCount() < before) {
          await sleep(500);
          closeWindowSafe();
          return qty;
        }
        if (state.spamSeen) break;
      }
      if (state.listedSeen || itemCount() < before) {
        closeWindowSafe();
        return qty;
      }
      log('Onay tiklandi ama ilan dogrulanamadi.');
    } else {
      log(`Onay penceresi ${CFG.confirmWaitMs / 1000} sn icinde acilmadi (deneme ${attempt}/${CFG.spamMaxRetries}).`);
    }

    closeWindowSafe();
    if (state.spamSeen) {
      log(`Anti-spam uyarisi, ${CFG.spamRetryDelayMs / 1000} sn bekleniyor.`);
      await sleep(CFG.spamRetryDelayMs);
    } else {
      await sleep(1500);
    }
  }
  throw new Error('satis basarisiz, tekrar denemeler tukendi');
}

// Ilan koyar. { items: satilan adet, listings: acilan ilan sayisi } dondurur
async function sellAll(token) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  // Satis takibi ilan koymaya baslarken acilir (hemen satilan ilanlar da sayilsin)
  state.soldCount = 0;
  state.salesTracking = true;

  const currentCount = itemCount(itemCfg.itemId);
  log(`Satis basliyor (envanterde ${currentCount} adet, hedef ${itemCfg.sellCount}, ilan basina ${itemCfg.sellBatch})`);
  let items = 0;
  let listings = 0;
  while (items < itemCfg.sellCount) {
    assertActive(token);
    if (itemCount(itemCfg.itemId) === 0) {
      log('Envanterde item kalmadi.');
      break;
    }

    let sellPrice = itemCfg.sellPrice;
    if (S.autoPriceEnabled) {
      const lowest = await fetchLowestListingPrice(token);
      sellPrice = computeSellPrice(lowest);
      if (lowest !== null) {
        dlog(`Piyasa tarandi: en dusuk ${lowest} -> satis fiyati ${sellPrice} olarak belirlendi.`);
      } else {
        dlog(`Piyasada ilan bulunamadi, yedek fiyat kullaniliyor: ${sellPrice}`);
      }
    }
    state.lastSellPrice = sellPrice;
    assertActive(token);

    const n = await sellOne(token, Math.min(itemCfg.sellBatch, itemCfg.sellCount - items), sellPrice);
    if (!n) break;
    items += n;
    listings++;
    log(`Ilan: ${n}x ${itemCfg.item} @ ${sellPrice}  (${items}/${itemCfg.sellCount}, kalan ${itemCount(itemCfg.itemId)})`);
    bumpStats({ listingsCreated: 1, itemsListed: n });
    recordListing({
      category: itemCfg.category || 'Genel Satış',
      item: itemCfg.item,
      amount: n,
      sellPrice: sellPrice,
      total: n * sellPrice,
      unitCost: itemCfg.orderPrice || 0,
      totalCost: (itemCfg.orderPrice || 0) * n,
      note: `/ah üzerinden ${n}x ${itemCfg.item} satışa sunuldu`,
    });
    if (items < itemCfg.sellCount) await humanSleep(S.sellDelayMs);
  }
  log(`Ilan koyma bitti: ${items} adet, ${listings} ilan.`);
  return { items, listings };
}

// Ilanlar satilana kadar bekler. Sure dolarsa hata verir.
async function waitForSales(token, listings) {
  const S = state.S;
  const itemCfg = state.getActiveItem ? state.getActiveItem() : S;
  if (listings <= 0) return;

  const need = Math.max(1, Math.ceil((listings * S.salesPct) / 100));
  const maxMs = S.salesWaitMin * 60 * 1000;
  log(`Satislar bekleniyor: ${listings} ilandan ${need} tanesi satilinca yeni siparis verilecek (en fazla ${S.salesWaitMin} dk).`);

  const start = Date.now();
  let lastBeat = Date.now();
  let lastRelistCheck = Date.now();

  while (state.soldCount < need) {
    assertActive(token);
    const elapsed = Date.now() - start;
    if (elapsed > maxMs) {
      throw new Error(`satislar ${S.salesWaitMin} dk icinde tamamlanmadi (${state.soldCount}/${need} satis algilandi). Satis mesaji ayarini kontrol et.`);
    }
    if (Date.now() - lastBeat >= CFG.salesHeartbeatMs) {
      lastBeat = Date.now();
      log(`Hala bekleniyor: ${state.soldCount}/${need} satis, ${Math.round(elapsed / 60000)} dk gecti.`);
    }

    // Fiyat kirilma (Undercut) takibi
    if (S.relistEnabled && Date.now() - lastRelistCheck >= CFG.relistCheckIntervalMs) {
      lastRelistCheck = Date.now();
      try {
        const lowest = await fetchLowestListingPrice(token);
        if (lowest !== null && state.lastSellPrice !== null && lowest < state.lastSellPrice) {
          const undercutDiff = state.lastSellPrice - lowest;
          log(`⚠️ FIYAT KIRILDI: ${itemCfg.item} icin biri $${undercutDiff.toLocaleString()} daha ucuza ilan koydu! (Piyasa en ucuz: $${lowest.toLocaleString()}, Bizim son ilan: $${state.lastSellPrice.toLocaleString()})`);
        }
      } catch (err) {
        dlog(`Relist piyasa kontrolunde hata: ${err.message}`);
      }
    }

    await humanSleep(1000);
  }

  log(`Yeterli satis oldu (${state.soldCount}/${listings}). Yeni siparise geciliyor.`);
}

module.exports = { isSaleMessage, parseSaleMessage, prepareStackAndHold, sellOne, sellAll, waitForSales };
