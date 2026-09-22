'use strict';

const state = require('../state');
const { toText, titleOf } = require('./text');

const ROMAN_NUMS = ['', 'I', 'II', 'III', 'IV', 'V'];

function formatEnchantLine(e) {
  if (!e || !e.name) return '';
  const title = String(e.name).split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const lvl = Number(e.lvl) || 1;
  const showLevel = lvl > 1 || (e.name !== 'mending' && e.name !== 'aqua_affinity');
  const lvlStr = showLevel ? ' ' + (ROMAN_NUMS[lvl] || lvl) : '';
  return `${title}${lvlStr}`;
}

// 1.20.5+ / 1.21 component, NBT, prismarine-item ve lore uzerinden tum buyuleri ceker
function extractItemEnchantments(item) {
  if (!item) return [];
  const results = [];

  function add(name, lvl) {
    if (!name) return;
    const cleanName = String(name).toLowerCase().replace(/^minecraft:/, '').trim();
    const cleanLvl = Number(lvl) || 1;
    if (!results.some((r) => r.name === cleanName && r.lvl === cleanLvl)) {
      results.push({ name: cleanName, lvl: cleanLvl });
    }
  }

  // 1. item.enchants (prismarine-item enchants getter)
  try {
    if (Array.isArray(item.enchants)) {
      for (const e of item.enchants) {
        if (e) add(e.name, e.lvl || e.level);
      }
    }
  } catch (_) {}

  // 2. Components (1.20.5+ / 1.21 protocol)
  let registry = null;
  try {
    registry = state.bot?.registry || require('minecraft-data')('1.21');
  } catch (_) {}

  const compList = [];
  if (item.componentMap instanceof Map) {
    for (const val of item.componentMap.values()) compList.push(val);
  }
  if (Array.isArray(item.components)) {
    for (const c of item.components) compList.push(c);
  }

  for (const comp of compList) {
    if (!comp) continue;
    const type = String(comp.type || '').replace(/^minecraft:/, '');
    if (type === 'stored_enchantments' || type === 'enchantments') {
      const data = comp.data;
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (!entry) continue;
          let eName = entry.name;
          if (!eName && entry.id !== undefined) {
            eName = typeof entry.id === 'string' ? entry.id : registry?.enchantments?.[entry.id]?.name;
          }
          add(eName, entry.level ?? entry.lvl);
        }
      } else if (data && typeof data === 'object') {
        const list = Array.isArray(data.enchantments) ? data.enchantments : (Array.isArray(data.value) ? data.value : null);
        if (list) {
          for (const entry of list) {
            let eName = entry.name;
            if (!eName && entry.id !== undefined) {
              eName = typeof entry.id === 'string' ? entry.id : registry?.enchantments?.[entry.id]?.name;
            }
            add(eName, entry.level ?? entry.lvl);
          }
        } else {
          for (const [key, lvl] of Object.entries(data)) {
            let eName = typeof key === 'string' && isNaN(key) ? key : registry?.enchantments?.[key]?.name;
            add(eName, lvl);
          }
        }
      }
    }
  }

  // 3. NBT (StoredEnchantments / Enchantments / ench)
  try {
    const nbtData = item.nbt;
    if (nbtData) {
      let simplified = null;
      try {
        const nbtHelper = require('prismarine-nbt');
        simplified = nbtHelper.simplify(nbtData);
      } catch (_) {
        simplified = nbtData.value || nbtData;
      }
      const rawList = simplified?.StoredEnchantments || simplified?.Enchantments || simplified?.ench || [];
      if (Array.isArray(rawList)) {
        for (const entry of rawList) {
          let eName = entry.id;
          if (typeof eName === 'number') eName = registry?.enchantments?.[eName]?.name;
          add(eName, entry.lvl ?? entry.level);
        }
      }
    }
  } catch (_) {}

  // 4. Custom Lore / Display text fallback (Metin analizi)
  const allText = [
    item.displayName,
    item.name,
    ...(Array.isArray(item.customLore) ? item.customLore : []),
  ].filter(Boolean).join(' ').toLowerCase();

  const ROMAN_MAP = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
  const patterns = [
    { re: /blast protection\s+(iv|iii|ii|i|\d)/i, name: 'blast_protection' },
    { re: /respiration\s+(iii|ii|i|\d)/i, name: 'respiration' },
    { re: /mending(?:\s+(i|\d))?/i, name: 'mending' },
    { re: /unbreaking\s+(iii|ii|i|\d)/i, name: 'unbreaking' },
    { re: /aqua affinity(?:\s+(i|\d))?/i, name: 'aqua_affinity' },
  ];

  for (const p of patterns) {
    const match = allText.match(p.re);
    if (match) {
      const lvlStr = (match[1] || '1').toLowerCase();
      const lvl = ROMAN_MAP[lvlStr] || 1;
      add(p.name, lvl);
    }
  }

  return results;
}

function loreOf(item) {
  if (!item) return [];
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

  // Eger lore icinde buyuler yoksa (orn. vanilla enchanted book), component/NBT buyulerini lore'a ekle
  try {
    const enchs = extractItemEnchantments(item);
    for (const e of enchs) {
      const line = formatEnchantLine(e);
      const exists = lines.some((l) => l.toLowerCase().includes(e.name.replace(/_/g, ' ')));
      if (!exists && line) {
        lines.push(line);
      }
    }
  } catch (_) {}

  return lines.map((l) => l.trim()).filter(Boolean);
}

function displayOf(item) {
  if (!item) return '';
  let n = item.displayName || item.name;
  try { if (item.customName) n = toText(item.customName) || n; } catch (_) {}
  if (item.name === 'enchanted_book') {
    try {
      const enchs = extractItemEnchantments(item);
      if (enchs.length > 0) {
        const summary = enchs.map(formatEnchantLine).join(', ');
        return `${n} (${summary})`;
      }
    } catch (_) {}
  }
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

module.exports = {
  loreOf,
  displayOf,
  parsePrices,
  snapshotWindow,
  buildSlotInfo,
  snapshotFull,
  extractItemEnchantments,
  formatEnchantLine,
};
