'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const CFG = require('../config');
const state = require('../state');
const { log, logBuffer } = require('../logger');
const { DEFAULT_SETTINGS, sanitize, saveSettings } = require('../settings');
const { resetStats, calculateUnitEconomics } = require('../stats');
const { snapshotFull } = require('../utils/inspect');
const { startAutomation, stopAutomation } = require('../features/automation');
const { probeAction } = require('../features/probe');
const pages = require('./pages');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
state.io = io; // diger moduller state.io uzerinden yayin yapar
app.use(express.json());

// ---------------- SAYFALAR ----------------
app.get('/', (_req, res) => res.send(pages.homePage()));
app.get('/casino', (_req, res) => res.send(pages.casinoPage()));
app.get('/ledger', (_req, res) => res.send(pages.ledgerPage()));
app.get('/settings', (_req, res) => res.send(pages.settingsPage()));
app.get('/probe', (_req, res) => res.send(pages.probePage()));
app.get('/stats', (_req, res) => res.send(pages.statsPage()));

// ---------------- API: CASINO ----------------
app.get('/api/casino/info', (_req, res) => {
  const botName = state.bot?.username || CFG.username || 'Bot';
  res.json({
    botName,
    minBet: 1000,
    coinflipMultiplier: 1.95,
  });
});

app.get('/api/casino/user/:username', (req, res) => {
  try {
    const casinoEngine = require('../features/casino/engine');
    const profile = casinoEngine.getUserProfile(req.params.username);
    res.json({ ok: true, profile });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get('/api/casino/games', (_req, res) => {
  try {
    const casinoEngine = require('../features/casino/engine');
    res.json({
      ok: true,
      recent: casinoEngine.getRecentGames(),
      house: casinoEngine.getHouseStats(),
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---------------- API: ISTATISTIK & MUHASEBE ----------------
app.get('/api/stats', (_req, res) => res.json(state.STATS));
app.get('/api/ledger', (_req, res) => res.json(state.STATS.ledger || []));
app.get('/api/economics', (_req, res) => res.json(calculateUnitEconomics()));

app.post('/api/stats/reset', (_req, res) => {
  const stats = resetStats();
  res.json({ ok: true, stats });
});

// ---------------- API: AYARLAR ----------------
app.get('/api/settings', (_req, res) => res.json(state.S));

app.post('/api/settings', (req, res) => {
  if (state.running) {
    return res.status(409).json({ ok: false, errors: ['Otomasyon calisirken ayar degistirilemez. Once DURDUR.'] });
  }
  const { settings, errors } = sanitize(req.body || {}, state.S);
  if (errors.length) return res.status(400).json({ ok: false, errors });
  state.S = settings;
  saveSettings();
  const S = state.S;
  if (S.portfolioEnabled && Array.isArray(S.portfolio) && S.portfolio.length > 0) {
    log(`Ayarlar guncellendi: Portfoy modu aktif (${S.portfolio.length} item).`);
  } else {
    log(`Ayarlar guncellendi: ${S.orderAmount}x ${S.item} siparis: ${S.autoOrderPriceEnabled ? `otomatik (en yuksegin ${S.orderMarkup} ustu, tavan ${S.maxOrderPrice})` : `sabit @ ${S.orderPrice}`}`);
  }
  res.json({ ok: true, settings: S });
});

app.post('/api/settings/reset', (_req, res) => {
  if (state.running) {
    return res.status(409).json({ ok: false, errors: ['Otomasyon calisirken ayar degistirilemez. Once DURDUR.'] });
  }
  state.S = { ...DEFAULT_SETTINGS };
  saveSettings();
  log('Ayarlar varsayilana donduruldu.');
  res.json({ ok: true, settings: state.S });
});

// ---------------- API: BAKIYE ----------------
app.get('/api/balance', (_req, res) => res.json({ balance: state.balance }));

// ---------------- SOCKET ----------------
io.on('connection', (socket) => {
  socket.emit('history', logBuffer);
  socket.emit('status', state.running);
  socket.emit('botStatus', state.botConnected);
  socket.emit('stats', state.STATS);
  socket.emit('balance', state.balance);
  if (state.bot) socket.emit('probe:snapshot', snapshotFull());

  socket.on('start', (mode) => startAutomation(mode));
  socket.on('resume', () => startAutomation('resume'));
  socket.on('stop', stopAutomation);
  socket.on('probe', (p) => { probeAction(p); });

  socket.on('queryBalance', () => {
    try {
      const { queryBalance } = require('../bot');
      queryBalance();
    } catch (_) {}
  });

  socket.on('exit', () => {
    try {
      const { quitBot } = require('../bot');
      quitBot();
    } catch (_) {}
  });

  socket.on('botExit', () => {
    try {
      const { quitBot } = require('../bot');
      quitBot();
    } catch (_) {}
  });

  socket.on('botJoin', () => {
    try {
      const { joinBot } = require('../bot');
      joinBot();
    } catch (_) {}
  });

  // ---------------- CASINO SOCKET HANDLERS ----------------
  socket.on('casino:getUser', (username, cb) => {
    try {
      const casinoEngine = require('../features/casino/engine');
      const profile = casinoEngine.getUserProfile(username);
      if (typeof cb === 'function') cb({ ok: true, profile });
    } catch (e) {
      if (typeof cb === 'function') cb({ ok: false, error: e.message });
    }
  });

  socket.on('casino:coinflip', ({ username, bet, choice }, cb) => {
    try {
      const casinoEngine = require('../features/casino/engine');
      const res = casinoEngine.playCoinflipGame(username, bet, choice);
      if (typeof cb === 'function') cb({ ok: true, result: res });
    } catch (e) {
      if (typeof cb === 'function') cb({ ok: false, error: e.message });
    }
  });

  socket.on('casino:minesStart', ({ username, bet, mines }, cb) => {
    try {
      const casinoEngine = require('../features/casino/engine');
      const res = casinoEngine.startMinesGame(username, bet, mines);
      if (typeof cb === 'function') cb({ ok: true, result: res });
    } catch (e) {
      if (typeof cb === 'function') cb({ ok: false, error: e.message });
    }
  });

  socket.on('casino:minesReveal', ({ username, gameId, tileIndex }, cb) => {
    try {
      const casinoEngine = require('../features/casino/engine');
      const res = casinoEngine.revealMinesTile(username, gameId, tileIndex);
      if (typeof cb === 'function') cb({ ok: true, result: res });
    } catch (e) {
      if (typeof cb === 'function') cb({ ok: false, error: e.message });
    }
  });

  socket.on('casino:minesCashout', ({ username, gameId }, cb) => {
    try {
      const casinoEngine = require('../features/casino/engine');
      const res = casinoEngine.cashoutMinesGame(username, gameId);
      if (typeof cb === 'function') cb({ ok: true, result: res });
    } catch (e) {
      if (typeof cb === 'function') cb({ ok: false, error: e.message });
    }
  });

  socket.on('casino:withdraw', async ({ username, amount }, cb) => {
    try {
      const casinoEngine = require('../features/casino/engine');
      const res = await casinoEngine.requestWithdraw(username, amount);
      if (typeof cb === 'function') cb({ ok: true, result: res });
    } catch (e) {
      if (typeof cb === 'function') cb({ ok: false, error: e.message });
    }
  });
});

function start() {
  server.listen(CFG.panelPort, '127.0.0.1', () => {
    log(`Panel:    http://localhost:${CFG.panelPort}`);
    log(`Ayarlar:  http://localhost:${CFG.panelPort}/settings`);
    log(`Kesif:    http://localhost:${CFG.panelPort}/probe`);
  });
}

module.exports = { app, server, io, start };
