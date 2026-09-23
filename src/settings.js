'use strict';

const fs = require('fs');
const CFG = require('./config');
const state = require('./state');
const { log } = require('./logger');

// PANELDEN DEGISEN AYARLAR
const DEFAULT_SETTINGS = {
  item: 'Block of Gold',
  itemId: 'gold_block',
  orderAmount: 10,
  orderPrice: 26000,
  sellPrice: 49000,
  sellCount: 10,
  sellBatch: 1,
  sellDelayMs: 3500,
  clickDelayMs: 600,
  maxCycles: 0,
  waitForSales: true,
  soldRegex: '\\b(sold|purchased|bought)\\b',
  salesPct: 100,
  salesWaitMin: 120,
  verbose: false,

  // Otomatik fiyat / ucuzlatma (AH satis)
  autoPriceEnabled: true,
  undercutAmount: 100,
  minSellPrice: 1,
  ahSearchCmd: '/ah',

  // Otomatik siparis fiyati (siparis panosundaki en yuksek fiyatin ustune cikip siparis verir)
  autoOrderPriceEnabled: true,
  orderMarkup: 100,
  maxOrderPrice: 1e12,
  orderSearchCmd: '/order',

  // Akilli Siparis & Outbid Korumasi
  autoOutbidRelist: true,
  orderTimeoutMin: 10,
  outbidCheckIntervalSec: 60,

  // Anti-Detection & Davranis
  humanDelays: true,
  antiAfk: true,

  // Ilan Takibi & Relist
  relistEnabled: true,

  // Coklu Item / Portfoy
  portfolioEnabled: false,
  portfolio: [
    {
      item: 'Block of Gold',
      itemId: 'gold_block',
      orderAmount: 10,
      orderPrice: 26000,
      sellPrice: 49000,
      sellCount: 10,
      sellBatch: 1,
      undercutAmount: 100,
      minSellPrice: 1,
    }
  ],

  // God Helmet (Auto-Enchant & Ors)
  godHelmetSellPrice: 250000,
  godHelmetMinSellPrice: 100000,
  godHelmetUndercut: 1000,
  godHelmetMinProfit: 25000,
  godHelmetAutoBuyAnvil: true,
  anvilOrderAmount: 40,
  xpBottleOrderAmount: 3200,
  bookBlastOrderPrice: 15000,
  bookRespOrderPrice: 15000,
  bookMendingOrderPrice: 25000,
  bookUnbOrderPrice: 15000,
  bookAquaOrderPrice: 10000,
  godHelmetBatchOrderAmount: 50,
};

const SCHEMA = {
  item:             { type: 'text',  label: 'Item adi' },
  itemId:           { type: 'id',    label: 'Item ID' },
  orderAmount:      { type: 'int',   label: 'Siparis adedi',               min: 1,    max: 1000000 },
  orderPrice:       { type: 'int',   label: 'Siparis fiyati (Büyülü/Sabit)', min: 1,    max: 1e12 },
  sellPrice:        { type: 'int',   label: 'Yedek satis fiyati',          min: 1,    max: 1e12 },
  sellCount:        { type: 'int',   label: 'Turda satilacak toplam adet', min: 1,    max: 100 },
  sellBatch:        { type: 'int',   label: 'Ilan basina adet',            min: 1,    max: 64 },
  sellDelayMs:      { type: 'int',   label: 'Satislar arasi bekleme',      min: 1000, max: 60000 },
  clickDelayMs:     { type: 'int',   label: 'Tiklama gecikmesi',           min: 200,  max: 5000 },
  maxCycles:        { type: 'int',   label: 'Dongu sayisi',                min: 0,    max: 1000 },
  waitForSales:     { type: 'bool',  label: 'Ilanlar satilinca yeni siparise gec' },
  soldRegex:        { type: 'regex', label: 'Satis mesaji (regex)' },
  salesPct:         { type: 'int',   label: 'Kac % satilinca devam',       min: 1,    max: 100 },
  salesWaitMin:     { type: 'int',   label: 'En fazla bekleme (dk)',       min: 1,    max: 1440 },
  verbose:          { type: 'bool',  label: 'Ayrintili log' },

  autoPriceEnabled: { type: 'bool',  label: 'Otomatik fiyat (en ucuzun altina in)' },
  undercutAmount:   { type: 'int',   label: 'Ucuzlatma miktari',           min: 0,    max: 1e9 },
  minSellPrice:     { type: 'int',   label: 'Minimum satis fiyati',        min: 1,    max: 1e12 },
  ahSearchCmd:      { type: 'text',  label: 'Piyasa arama komutu' },

  autoOrderPriceEnabled: { type: 'bool', label: 'Otomatik siparis fiyati (en ucuzun ustune cik)' },
  orderMarkup:           { type: 'int',  label: 'Siparis fiyati farki',        min: 0, max: 1e9 },
  maxOrderPrice:         { type: 'int',  label: 'Maksimum siparis fiyati',     min: 1, max: 1e12 },
  orderSearchCmd:        { type: 'text', label: 'Siparis panosu arama komutu' },

  // Akilli Siparis & Outbid Korumasi
  autoOutbidRelist:       { type: 'bool', label: 'Onune gecilince otomatik guncelle (Outbid)' },
  orderTimeoutMin:        { type: 'int',  label: 'Siparis zaman asimi (dk)',    min: 1, max: 180 },
  outbidCheckIntervalSec: { type: 'int',  label: 'Piyasa kontrol sikligi (sn)', min: 10, max: 600 },

  // Anti-Detection & Davranis
  humanDelays:           { type: 'bool', label: 'Insansi rastgele gecikmeler (jitter)' },
  antiAfk:               { type: 'bool', label: 'Anti-AFK (hafif hareketler)' },

  // Ilan Takibi & Relist
  relistEnabled:         { type: 'bool', label: 'Fiyat kirilinca ilani guncelle (Relist)' },

  // Coklu Item / Portfoy
  portfolioEnabled:      { type: 'bool', label: 'Coklu item / Portfoy modu' },

  // God Helmet (Auto-Enchant & Ors)
  godHelmetSellPrice:     { type: 'int',  label: 'God Helmet Yedek Satis Fiyati',   min: 1, max: 1e12 },
  godHelmetMinSellPrice:  { type: 'int',  label: 'God Helmet Taban Satis Fiyati',   min: 1, max: 1e12 },
  godHelmetUndercut:      { type: 'int',  label: 'God Helmet Ucuzlatma (Undercut)', min: 0, max: 1e9 },
  godHelmetMinProfit:     { type: 'int',  label: 'God Helmet Minimum Kar Garantisi', min: 0, max: 1e9 },
  godHelmetAutoBuyAnvil:  { type: 'bool', label: 'Ors Yoksa AH\'den Otomatik Satin Al' },
  godHelmetMaxAnvilPrice: { type: 'int',  label: 'AH\'den Ors Alirken Tavan Fiyat', min: 1, max: 1e12 },
  xpBottleOrderPrice:      { type: 'int',  label: 'XP Sisesi Siparis Fiyati ($)',    min: 1, max: 1e8 },
  xpBottleOrderAmount:     { type: 'int',  label: 'XP Sisesi Siparis Miktari',       min: 1, max: 2304 },
  diamondHelmetOrderPrice: { type: 'int',  label: 'Elmas Kask Siparis Fiyati ($)',   min: 1, max: 1e8 },
  bookBlastOrderPrice:     { type: 'int',  label: 'Blast Prot 4 Kitap Siparis ($)',  min: 1, max: 1e8 },
  bookRespOrderPrice:      { type: 'int',  label: 'Respiration 3 Kitap Siparis ($)', min: 1, max: 1e8 },
  bookMendingOrderPrice:   { type: 'int',  label: 'Mending Kitap Siparis ($)',       min: 1, max: 1e8 },
  bookUnbOrderPrice:       { type: 'int',  label: 'Unbreaking 3 Kitap Siparis ($)',  min: 1, max: 1e8 },
  bookAquaOrderPrice:      { type: 'int',  label: 'Aqua Affinity Kitap Siparis ($)', min: 1, max: 1e8 },
  godHelmetBatchOrderAmount: { type: 'int', label: 'God Helmet Toplu Siparis Miktari', min: 1, max: 1000 },
};

function sanitize(input, base) {
  const out = {};
  const errors = [];
  for (const [key, rule] of Object.entries(SCHEMA)) {
    const raw = input[key] === undefined ? base[key] : input[key];
    switch (rule.type) {
      case 'text': {
        const v = String(raw).trim();
        if (!/^[\x20-\x7E]{1,64}$/.test(v)) errors.push(`${rule.label}: 1-64 karakter, sadece duz ASCII olmali`);
        out[key] = v;
        break;
      }
      case 'id': {
        const v = String(raw).trim().toLowerCase();
        if (!/^[a-z0-9_]{1,64}$/.test(v)) errors.push(`${rule.label}: sadece kucuk harf, rakam ve _ (orn: gold_block)`);
        out[key] = v;
        break;
      }
      case 'regex': {
        const v = String(raw).trim();
        if (!/^[\x20-\x7E]{1,100}$/.test(v)) {
          errors.push(`${rule.label}: 1-100 karakter, sadece duz ASCII olmali`);
        } else {
          try { new RegExp(v, 'i'); } catch (e) { errors.push(`${rule.label}: gecersiz regex (${e.message})`); }
        }
        out[key] = v;
        break;
      }
      case 'int': {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < rule.min || n > rule.max) {
          errors.push(`${rule.label}: ${rule.min} ile ${rule.max} arasinda tam sayi olmali`);
        }
        out[key] = n;
        break;
      }
      case 'bool':
        out[key] = raw === true || raw === 'true';
        break;
    }
  }

  // Portfolio array dogrulama
  const rawPortfolio = input.portfolio !== undefined ? input.portfolio : base.portfolio;
  if (Array.isArray(rawPortfolio)) {
    const cleanPortfolio = [];
    rawPortfolio.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;
      const cleanItem = {
        item: String(item.item || 'Item').trim().slice(0, 64),
        itemId: String(item.itemId || 'dirt').trim().toLowerCase().slice(0, 64),
        orderAmount: Math.max(1, parseInt(item.orderAmount, 10) || 1),
        orderPrice: Math.max(1, parseInt(item.orderPrice, 10) || 1000),
        sellPrice: Math.max(1, parseInt(item.sellPrice, 10) || 2000),
        sellCount: Math.max(1, parseInt(item.sellCount, 10) || 1),
        sellBatch: Math.max(1, parseInt(item.sellBatch, 10) || 1),
        undercutAmount: Math.max(0, parseInt(item.undercutAmount, 10) || 100),
        minSellPrice: Math.max(1, parseInt(item.minSellPrice, 10) || 1),
      };
      cleanPortfolio.push(cleanItem);
    });
    out.portfolio = cleanPortfolio;
  } else {
    out.portfolio = Array.isArray(base.portfolio) ? base.portfolio : [];
  }
  return { settings: out, errors };
}

function loadSettings() {
  try {
    if (!fs.existsSync(CFG.settingsFile)) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(fs.readFileSync(CFG.settingsFile, 'utf8'));
    // Eski settings.json'da yeni alanlar yoksa varsayilanlarla tamamla
    const { settings, errors } = sanitize(parsed, DEFAULT_SETTINGS);
    if (errors.length) {
      console.log('settings.json gecersiz, varsayilanlar kullaniliyor: ' + errors.join(' | '));
      return { ...DEFAULT_SETTINGS };
    }
    return settings;
  } catch (e) {
    console.log('settings.json okunamadi, varsayilanlar kullaniliyor: ' + e.message);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(CFG.settingsFile, JSON.stringify(state.S, null, 2), 'utf8');
    return true;
  } catch (e) {
    log(`settings.json yazilamadi: ${e.message}`);
    return false;
  }
}

// Modul yuklenince ayarlar diskten okunur
state.S = loadSettings();

module.exports = { DEFAULT_SETTINGS, SCHEMA, sanitize, loadSettings, saveSettings };
