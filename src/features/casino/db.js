'use strict';

const fs = require('fs');
const path = require('path');
const { log } = require('../../logger');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'casino_data.json');

const DEFAULT_DATA = {
  users: {},
  house: {
    totalProfit: 0,
    totalVolume: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
  },
  recentGames: [],
  transactions: [],
};

let data = null;
let saveDebounceTimer = null;

function loadData() {
  if (data) return data;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      data = JSON.parse(raw);
    } else {
      data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      saveDataSync();
    }
  } catch (err) {
    log(`⚠️ casino_data.json okunamadi (${err.message}), varsayılan oluşturuluyor.`);
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  if (!data.users || typeof data.users !== 'object') data.users = {};
  if (!data.house || typeof data.house !== 'object') data.house = { totalProfit: 0, totalVolume: 0, totalDeposited: 0, totalWithdrawn: 0 };
  if (!Array.isArray(data.recentGames)) data.recentGames = [];
  if (!Array.isArray(data.transactions)) data.transactions = [];

  return data;
}

function saveDataSync() {
  if (!data) return;
  try {
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
  } catch (err) {
    log(`❌ casino_data.json kaydetme hatasi: ${err.message}`);
  }
}

function scheduleSave(delayMs = 300) {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    saveDataSync();
  }, delayMs);
}

function getUser(rawUsername) {
  if (!rawUsername) return null;
  const username = String(rawUsername).trim();
  const db = loadData();
  const key = username.toLowerCase();

  if (!db.users[key]) {
    db.users[key] = {
      username: username,
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      gamesPlayed: 0,
      totalWon: 0,
      totalLost: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    scheduleSave(100);
  }

  db.users[key].lastActive = Date.now();
  return db.users[key];
}

function updateUser(rawUsername, updates) {
  const user = getUser(rawUsername);
  if (!user) return null;
  Object.assign(user, updates);
  scheduleSave();
  return user;
}

function addTransaction(tx) {
  const db = loadData();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: Date.now(),
    ...tx,
  };
  db.transactions.unshift(entry);
  if (db.transactions.length > 500) db.transactions.length = 500;
  scheduleSave();
  return entry;
}

function addRecentGame(game) {
  const db = loadData();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: Date.now(),
    ...game,
  };
  db.recentGames.unshift(entry);
  if (db.recentGames.length > 100) db.recentGames.length = 100;
  scheduleSave();
  return entry;
}

function getRecentGames(limit = 20) {
  const db = loadData();
  return db.recentGames.slice(0, limit);
}

function getHouseStats() {
  const db = loadData();
  return db.house;
}

module.exports = {
  loadData,
  saveDataSync,
  getUser,
  updateUser,
  addTransaction,
  addRecentGame,
  getRecentGames,
  getHouseStats,
};
