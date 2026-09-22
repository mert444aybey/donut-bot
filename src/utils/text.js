'use strict';

const state = require('../state');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// İnsansı gecikmeler için rastgele sapma (jitter) hesaplar
function randomDelay(baseMs, jitterPercent = 0.25) {
  if (!baseMs || baseMs <= 0) return 0;
  const delta = baseMs * jitterPercent;
  const min = Math.max(10, baseMs - delta);
  const max = baseMs + delta;
  return Math.floor(min + Math.random() * (max - min));
}

async function humanSleep(baseMs, jitterPercent = 0.25) {
  const S = state.S;
  if (S && S.humanDelays === false) {
    return sleep(baseMs);
  }
  return sleep(randomDelay(baseMs, jitterPercent));
}

// prismarine-chat parse edemezse (ornegin 1.21 yeni text-component formati)
// ham JSON metin bilesenlerinden elle duz metin cikarmak icin yedek yol.
function extractPlainText(node) {
  try {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractPlainText).join('');
    if (typeof node === 'object') {
      let s = '';
      if (typeof node.text === 'string') s += node.text;
      if (Array.isArray(node.extra)) s += node.extra.map(extractPlainText).join('');
      if (Array.isArray(node.with)) s += node.with.map(extractPlainText).join('');
      return s;
    }
    return '';
  } catch (_) {
    return '';
  }
}

// 1.21+ item bilesenlerinde (custom_name, lore vb.) metin verisi bazen duz JSON
// chat component olarak degil, ham NBT "type/value" notasyonu olarak geliyor,
// orn: {"type":"compound","value":{"text":{"type":"string","value":"..."}}}.
// Bu fonksiyon bu notasyonu normal JS/JSON nesnesine (duz chat component'e) cevirir.
// Zaten sade bir nesne verilirse (type alani yoksa) oldugu gibi (recursive) birakir,
// yani hem eski hem yeni format icin guvenlidir.
function simplifyNbt(node) {
  if (node === null || typeof node !== 'object') return node;

  if (!('type' in node)) {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = simplifyNbt(v);
    return out;
  }

  const { type, value } = node;
  switch (type) {
    case 'compound': {
      const out = {};
      for (const [k, v] of Object.entries(value || {})) out[k] = simplifyNbt(v);
      return out;
    }
    case 'list': {
      const inner = value || {};
      const arr = inner.value;
      if (!Array.isArray(arr)) return [];
      if (inner.type === 'compound') {
        return arr.map((el) => {
          const out = {};
          for (const [k, v] of Object.entries(el || {})) out[k] = simplifyNbt(v);
          return out;
        });
      }
      return arr.map(simplifyNbt);
    }
    case 'string':
    case 'byte':
    case 'short':
    case 'int':
    case 'long':
    case 'float':
    case 'double':
    case 'byteArray':
    case 'intArray':
    case 'longArray':
      return value;
    default:
      return value;
  }
}

function toText(v) {
  try {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') {
      try { return toText(JSON.parse(v)); } catch (_) { return v; }
    }
    const simplified = simplifyNbt(v);
    if (state.ChatMessage) {
      try {
        const s = new state.ChatMessage(simplified).toString();
        if (s) return s;
      } catch (_) { /* asagida yedek yonteme dusulecek */ }
    }
    const plain = extractPlainText(simplified);
    if (plain) return plain;
    return JSON.stringify(simplified);
  } catch (_) {
    try { return JSON.stringify(v); } catch (__) { return '[okunamadi]'; }
  }
}

function titleOf(win) {
  try {
    const t = win.title;
    let out;
    if (typeof t === 'string') {
      try { out = toText(JSON.parse(t)) || t; } catch (_) { out = t; }
    } else {
      out = toText(t);
    }
    return out || win.type;
  } catch (_) {
    return win.type;
  }
}

function filledSlots(win) {
  return win.slots
    .map((it, i) => (it ? `${i}:${it.name}` : null))
    .filter(Boolean)
    .join(', ');
}

module.exports = { sleep, humanSleep, randomDelay, extractPlainText, simplifyNbt, toText, titleOf, filledSlots };
