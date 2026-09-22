'use strict';

const state = require('../state');
const { toText, titleOf } = require('./text');

function loreOf(item) {
  const lines = [];
  try {
    if (Array.isArray(item.customLore)) {
      item.customLore.forEach((l) => lines.push(toText(l)));
    } else if (item.customLore) {
      lines.push(toText(item.customLore));
    }
  } catch (_) {}
  if (lines.length === 0 && Array.isArray(item.components)) {
    try {
      const c = item.components.find((x) => x && (x.type === 'lore' || x.type === 'minecraft:lore'));
      if (c && c.data) {
        const arr = Array.isArray(c.data) ? c.data : (c.data.value || []);
        if (Array.isArray(arr)) arr.forEach((l) => lines.push(toText(l)));
        else lines.push(toText(arr));
      }
    } catch (_) {}
  }
  return lines.map((l) => l.trim()).filter(Boolean);
}

function displayOf(item) {
  let n = item.displayName || item.name;
  try { if (item.customName) n = toText(item.customName) || n; } catch (_) {}
  return n;
}

// "$49K", "$1,500", "$1.5M" gibi $ isaretli fiyatlari sayiya cevirir
function parsePrices(text) {
  const out = [];
  const re = /\$\s*(\d[\d,]*\.?\d*)\s*([kKmMbB])?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    const suf = (m[2] || '').toLowerCase();
    if (suf === 'k') n *= 1e3;
    else if (suf === 'm') n *= 1e6;
    else if (suf === 'b') n *= 1e9;
    out.push({ raw: m[0].trim(), value: n });
  }
  return out;
}

// Acik pencerenin (envanter kismi haric) slotlarini okur: fiyat piyasa taramasinda kullanilir
function snapshotWindow(win) {
  if (!win) return null;
  const slots = [];
  for (let i = 0; i < win.inventoryStart; i++) {
    const it = win.slots[i];
    if (!it) { slots.push(null); continue; }
    const lore = loreOf(it);
    slots.push({
      name: it.name,
      count: it.count,
      display: displayOf(it),
      lore,
      prices: parsePrices(lore.join(' | ')),
    });
  }
  return { title: titleOf(win), type: win.type, slots };
}

// Tek bir slotu (mutlak indeksiyle birlikte) kesif sayfasi icin tarif eder.
function buildSlotInfo(win, absoluteIndex) {
  const it = win.slots[absoluteIndex];
  if (!it) return { slot: absoluteIndex, empty: true };
  const lore = loreOf(it);
  return {
    slot: absoluteIndex,
    empty: false,
    name: it.name,
    count: it.count,
    display: displayOf(it),
    lore,
    prices: parsePrices(lore.join(' | ')),
  };
}

// Kesif sayfasi icin: acik bir sunucu penceresi varsa onu ("container"), HER ZAMAN
// oyuncunun kendi envanterini ("inventory": 27 ana + 9 hotbar) ve pencere yokken
// ayrica zirh+sol el ("armor") dondurur.
function snapshotFull() {
  const bot = state.bot;
  if (!bot) return null;
  const win = bot.currentWindow || bot.inventory;
  if (!win) return null;
  const isChest = !!(bot.currentWindow && bot.currentWindow !== bot.inventory);

  const container = [];
  if (isChest) {
    for (let i = 0; i < win.inventoryStart; i++) container.push(buildSlotInfo(win, i));
  }

  const invBase = isChest ? win.inventoryStart : 9;
  const inventory = [];
  for (let k = 0; k < 36; k++) inventory.push(buildSlotInfo(win, invBase + k));

  let armor = null;
  if (!isChest) {
    armor = [8, 7, 6, 5, 45].map((i) => buildSlotInfo(win, i));
  }

  const cursorItem = win && win.selectedItem ? {
    name: win.selectedItem.name,
    count: win.selectedItem.count,
    display: displayOf(win.selectedItem),
  } : null;

  return {
    title: isChest ? titleOf(win) : 'Envanterin',
    type: win.type,
    isChest,
    container,
    inventory,
    armor,
    cursorItem,
  };
}

module.exports = { loreOf, displayOf, parsePrices, snapshotWindow, buildSlotInfo, snapshotFull };
