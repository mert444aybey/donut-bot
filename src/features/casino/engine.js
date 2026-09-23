'use strict';

const state = require('../../state');
const { log, dlog } = require('../../logger');
const db = require('./db');
const coinflip = require('./coinflip');
const mines = require('./mines');

// Para çekme (payout) isteklerini sıraya alıp bot ile oyundan güvenle öder
const payoutQueue = [];
let isProcessingPayouts = false;

function emitUserBalance(username) {
  if (!state.io || !username) return;
  const user = db.getUser(username);
  if (!user) return;
  state.io.emit(`casino:user:${username.toLowerCase()}`, {
    username: user.username,
    balance: user.balance,
  });
}

function emitPublicEvent(event, payload) {
  if (!state.io) return;
  state.io.emit(event, payload);
}

// 1. Oyuncunun Profil ve Bakiye Bilgisi
function getUserProfile(username) {
  if (!username) return null;
  const user = db.getUser(username);
  const activeMines = mines.getActiveMinesGame(username);
  return {
    username: user.username,
    balance: user.balance,
    totalDeposited: user.totalDeposited,
    totalWithdrawn: user.totalWithdrawn,
    gamesPlayed: user.gamesPlayed,
    totalWon: user.totalWon,
    totalLost: user.totalLost,
    activeMines,
  };
}

// 2. Oyun İçi Para Yatırma (Deposit - /pay ile)
function handleDeposit(rawUsername, rawAmount) {
  const username = String(rawUsername).trim();
  const amount = Math.round(Number(rawAmount));
  if (!username || isNaN(amount) || amount <= 0) return false;

  const user = db.getUser(username);
  user.balance += amount;
  user.totalDeposited += amount;
  db.updateUser(username, user);

  const house = db.getHouseStats();
  house.totalDeposited += amount;
  db.scheduleSave ? db.scheduleSave() : db.saveDataSync();

  db.addTransaction({
    type: 'DEPOSIT',
    username,
    amount,
    note: `/pay ile $${amount.toLocaleString()} yatırıldı`,
  });

  log(`💳 CASINO DEPOSIT: ${username} hesabına +$${amount.toLocaleString()} yüklendi! (Yeni Bakiye: $${user.balance.toLocaleString()})`);

  emitUserBalance(username);
  emitPublicEvent('casino:activity', {
    type: 'deposit',
    username,
    amount,
    time: Date.now(),
  });

  return true;
}

// 3. Oyun İçi Para Çekme Talebi (Withdraw / Payout)
async function requestWithdraw(rawUsername, rawAmount) {
  const username = String(rawUsername).trim();
  const amount = Math.round(Number(rawAmount));

  if (!username) throw new Error('Kullanıcı adı gerekli.');
  if (isNaN(amount) || amount < 1000) throw new Error('Minimum çekim tutarı $1,000 olmalıdır.');

  const user = db.getUser(username);
  if (user.balance < amount) {
    throw new Error(`Yetersiz bakiye! (Mevcut: $${user.balance.toLocaleString()})`);
  }

  // Bakiyeyi anında rezerve et
  user.balance -= amount;
  user.totalWithdrawn += amount;
  db.updateUser(username, user);

  const house = db.getHouseStats();
  house.totalWithdrawn += amount;

  const tx = db.addTransaction({
    type: 'WITHDRAW',
    username,
    amount,
    status: 'QUEUED',
    note: `/pay ile $${amount.toLocaleString()} çekim talebi oluşturuldu`,
  });

  emitUserBalance(username);
  log(`💸 CASINO WITHDRAW TALEBİ: ${username} $${amount.toLocaleString()} çekmek istiyor. Sıraya alındı...`);

  // Payout kuyruğuna ekle
  payoutQueue.push({ txId: tx.id, username, amount });
  processPayoutQueue();

  return { ok: true, amount, newBalance: user.balance };
}

// Payout Kuyruğunu İşleyen Asenkron Fonksiyon
async function processPayoutQueue() {
  if (isProcessingPayouts) return;
  isProcessingPayouts = true;

  try {
    while (payoutQueue.length > 0) {
      const task = payoutQueue[0];
      const bot = state.bot;

      if (!bot || !bot.entity) {
        dlog('Payout kuyruğu: Bot oyunda değil, bekleniyor...');
        break;
      }

      log(`📤 Payout yürütülüyor: /pay ${task.username} ${task.amount}`);
      bot.chat(`/pay ${task.username} ${task.amount}`);

      payoutQueue.shift();
      emitPublicEvent('casino:activity', {
        type: 'withdraw',
        username: task.username,
        amount: task.amount,
        time: Date.now(),
      });

      // Sunucu anti-spam engeline takılmamak için 2 saniye bekle
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    log(`❌ Payout kuyruk hatası: ${err.message}`);
  } finally {
    isProcessingPayouts = false;
  }
}

// 4. Coinflip Oyna
function playCoinflipGame(username, betAmount, choice) {
  const user = db.getUser(username);
  if (!user) throw new Error('Kullanıcı bulunamadı.');

  const result = coinflip.playCoinflip(user, betAmount, choice);

  // Bakiyeyi güncelle
  user.balance -= result.bet;
  user.gamesPlayed++;

  if (result.won) {
    user.balance += result.payout;
    user.totalWon += result.profit;
  } else {
    user.totalLost += result.bet;
  }
  db.updateUser(username, user);

  // Kasa İstatistikleri
  const house = db.getHouseStats();
  house.totalVolume += result.bet;
  house.totalProfit += (result.won ? -result.profit : result.bet);

  // Canlı Bildirim & Geçmiş
  const gameEntry = db.addRecentGame({
    game: 'coinflip',
    username: user.username,
    bet: result.bet,
    won: result.won,
    payout: result.payout,
    profit: result.profit,
    multiplier: result.multiplier,
    details: `${result.choice === 'heads' ? 'Yazı' : 'Tura'} (${result.resultSide === 'heads' ? 'Yazı' : 'Tura'} çıktı)`,
  });

  emitUserBalance(username);
  emitPublicEvent('casino:newGame', gameEntry);

  return {
    ...result,
    newBalance: user.balance,
  };
}

// 5. Mines (Mayın Tarlası) Başlat
function startMinesGame(username, betAmount, mineCount) {
  const user = db.getUser(username);
  if (!user) throw new Error('Kullanıcı bulunamadı.');

  const result = mines.startMines(user, betAmount, mineCount);

  // Bahsi bakiyeden düş
  user.balance -= result.bet;
  user.gamesPlayed++;
  db.updateUser(username, user);

  emitUserBalance(username);

  return {
    ...result,
    newBalance: user.balance,
  };
}

// 6. Mines Karo Aç
function revealMinesTile(username, gameId, tileIndex) {
  const user = db.getUser(username);
  if (!user) throw new Error('Kullanıcı bulunamadı.');

  const result = mines.revealTile(gameId, tileIndex, username);

  if (result.status === 'busted') {
    user.totalLost += Math.abs(result.profit);
    db.updateUser(username, user);

    const house = db.getHouseStats();
    house.totalVolume += Math.abs(result.profit);
    house.totalProfit += Math.abs(result.profit);

    const gameEntry = db.addRecentGame({
      game: 'mines',
      username: user.username,
      bet: Math.abs(result.profit),
      won: false,
      payout: 0,
      profit: result.profit,
      multiplier: 0,
      details: `${result.revealedTiles.length - 1} elmas açıldı, bombaya basıldı`,
    });
    emitPublicEvent('casino:newGame', gameEntry);
  } else if (result.status === 'cashed_out' && result.autoWin) {
    user.balance += result.payout;
    user.totalWon += result.profit;
    db.updateUser(username, user);

    const house = db.getHouseStats();
    house.totalVolume += (result.payout - result.profit);
    house.totalProfit -= result.profit;

    const gameEntry = db.addRecentGame({
      game: 'mines',
      username: user.username,
      bet: result.payout - result.profit,
      won: true,
      payout: result.payout,
      profit: result.profit,
      multiplier: result.multiplier,
      details: 'Tüm elmaslar açıldı! (MAX KAZANÇ)',
    });
    emitPublicEvent('casino:newGame', gameEntry);
  }

  emitUserBalance(username);

  return {
    ...result,
    newBalance: user.balance,
  };
}

// 7. Mines Bozdur (Cashout)
function cashoutMinesGame(username, gameId) {
  const user = db.getUser(username);
  if (!user) throw new Error('Kullanıcı bulunamadı.');

  const result = mines.cashoutMines(gameId, username);

  user.balance += result.payout;
  user.totalWon += result.profit;
  db.updateUser(username, user);

  const house = db.getHouseStats();
  const bet = result.payout - result.profit;
  house.totalVolume += bet;
  house.totalProfit -= result.profit;

  const gameEntry = db.addRecentGame({
    game: 'mines',
    username: user.username,
    bet,
    won: true,
    payout: result.payout,
    profit: result.profit,
    multiplier: result.multiplier,
    details: `${result.revealedTiles.length} elmas ile bozduruldu (${result.multiplier}x)`,
  });

  emitUserBalance(username);
  emitPublicEvent('casino:newGame', gameEntry);

  return {
    ...result,
    newBalance: user.balance,
  };
}

module.exports = {
  getUserProfile,
  handleDeposit,
  requestWithdraw,
  processPayoutQueue,
  playCoinflipGame,
  startMinesGame,
  revealMinesTile,
  cashoutMinesGame,
  getRecentGames: db.getRecentGames,
  getHouseStats: db.getHouseStats,
};
