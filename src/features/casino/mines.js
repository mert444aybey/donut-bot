'use strict';

const MIN_BET = 1000;
const TOTAL_TILES = 25; // 5x5
const HOUSE_EDGE = 0.05; // %5 Kasa Avantajı (RTP 0.95)

// Aktif oyunları bellekte tutar: gameId -> gameState
const activeGames = new Map();

// Matematiksel Kombinasyon Faktöriyeli üzerinden Çarpan Hesabı
function calculateMultiplier(mines, revealedCount) {
  if (revealedCount <= 0) return 1.0;
  const diamonds = TOTAL_TILES - mines;
  if (revealedCount > diamonds) revealedCount = diamonds;

  let probability = 1.0;
  for (let i = 0; i < revealedCount; i++) {
    probability *= (diamonds - i) / (TOTAL_TILES - i);
  }

  const rawMultiplier = (1 - HOUSE_EDGE) / probability;
  return Math.max(1.01, Math.round(rawMultiplier * 100) / 100);
}

// 0-24 arasında rastgele M adet benzersiz mayın konumu seçer
function generateMines(mineCount) {
  const positions = new Set();
  while (positions.size < mineCount) {
    const r = Math.floor(Math.random() * TOTAL_TILES);
    positions.add(r);
  }
  return Array.from(positions);
}

function startMines(user, betAmount, rawMines) {
  const bet = Math.round(Number(betAmount));
  if (isNaN(bet) || bet < MIN_BET) {
    throw new Error(`Minimum bahis $${MIN_BET.toLocaleString()} olmalıdır.`);
  }

  if (user.balance < bet) {
    throw new Error('Yetersiz bakiye!');
  }

  const mineCount = Math.round(Number(rawMines));
  if (isNaN(mineCount) || mineCount < 1 || mineCount > 24) {
    throw new Error('Mayın sayısı 1 ile 24 arasında olmalıdır.');
  }

  // Zaten aktif bir oyunu varsa bitirmesini iste
  for (const [id, g] of activeGames.entries()) {
    if (g.username.toLowerCase() === user.username.toLowerCase() && g.status === 'in_progress') {
      throw new Error('Devam eden bir Mayın Tarlası oyununuz var! Önce onu tamamlayın.');
    }
  }

  const gameId = `mines_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const mineLocations = generateMines(mineCount);

  const gameState = {
    gameId,
    username: user.username,
    bet,
    mineCount,
    mineLocations,
    revealedTiles: [],
    multiplier: 1.0,
    nextMultiplier: calculateMultiplier(mineCount, 1),
    status: 'in_progress', // 'in_progress', 'busted', 'cashed_out'
    createdAt: Date.now(),
  };

  activeGames.set(gameId, gameState);

  return {
    gameId,
    bet,
    mineCount,
    revealedTiles: [],
    multiplier: 1.0,
    nextMultiplier: gameState.nextMultiplier,
    status: 'in_progress',
  };
}

function revealTile(gameId, rawTileIndex, username) {
  const game = activeGames.get(gameId);
  if (!game) throw new Error('Oyun bulunamadı veya süresi doldu.');
  if (game.username.toLowerCase() !== username.toLowerCase()) throw new Error('Yetkisiz işlem.');
  if (game.status !== 'in_progress') throw new Error('Bu oyun zaten tamamlandı.');

  const tileIndex = Number(rawTileIndex);
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= TOTAL_TILES) {
    throw new Error('Geçersiz karo numarası.');
  }

  if (game.revealedTiles.includes(tileIndex)) {
    throw new Error('Bu karo zaten açıldı.');
  }

  const isMine = game.mineLocations.includes(tileIndex);

  if (isMine) {
    // Patladı!
    game.status = 'busted';
    game.revealedTiles.push(tileIndex);
    const mineLocations = game.mineLocations;
    activeGames.delete(gameId);

    return {
      gameId,
      status: 'busted',
      clickedTile: tileIndex,
      isMine: true,
      mineLocations, // Tüm mayınları göster
      revealedTiles: game.revealedTiles,
      payout: 0,
      profit: -game.bet,
    };
  }

  // Elmas çıktı!
  game.revealedTiles.push(tileIndex);
  const diamonds = TOTAL_TILES - game.mineCount;
  const currentMultiplier = calculateMultiplier(game.mineCount, game.revealedTiles.length);
  game.multiplier = currentMultiplier;

  // Tüm elmaslar açıldı mı?
  if (game.revealedTiles.length === diamonds) {
    game.status = 'cashed_out';
    const payout = Math.round(game.bet * currentMultiplier);
    const profit = payout - game.bet;
    const mineLocations = game.mineLocations;
    activeGames.delete(gameId);

    return {
      gameId,
      status: 'cashed_out',
      autoWin: true,
      clickedTile: tileIndex,
      isMine: false,
      multiplier: currentMultiplier,
      payout,
      profit,
      mineLocations,
      revealedTiles: game.revealedTiles,
    };
  }

  const nextMultiplier = calculateMultiplier(game.mineCount, game.revealedTiles.length + 1);
  game.nextMultiplier = nextMultiplier;

  return {
    gameId,
    status: 'in_progress',
    clickedTile: tileIndex,
    isMine: false,
    multiplier: currentMultiplier,
    nextMultiplier,
    revealedTiles: game.revealedTiles,
    currentPayout: Math.round(game.bet * currentMultiplier),
  };
}

function cashoutMines(gameId, username) {
  const game = activeGames.get(gameId);
  if (!game) throw new Error('Oyun bulunamadı veya süresi doldu.');
  if (game.username.toLowerCase() !== username.toLowerCase()) throw new Error('Yetkisiz işlem.');
  if (game.status !== 'in_progress') throw new Error('Bu oyun zaten tamamlandı.');

  if (game.revealedTiles.length === 0) {
    throw new Error('Henüz hiçbir elmas açmadınız!');
  }

  game.status = 'cashed_out';
  const payout = Math.round(game.bet * game.multiplier);
  const profit = payout - game.bet;
  const mineLocations = game.mineLocations;
  activeGames.delete(gameId);

  return {
    gameId,
    status: 'cashed_out',
    multiplier: game.multiplier,
    payout,
    profit,
    mineLocations,
    revealedTiles: game.revealedTiles,
  };
}

function getActiveMinesGame(username) {
  if (!username) return null;
  const clean = username.toLowerCase();
  for (const g of activeGames.values()) {
    if (g.username.toLowerCase() === clean && g.status === 'in_progress') {
      return {
        gameId: g.gameId,
        bet: g.bet,
        mineCount: g.mineCount,
        revealedTiles: g.revealedTiles,
        multiplier: g.multiplier,
        nextMultiplier: g.nextMultiplier,
        currentPayout: Math.round(g.bet * g.multiplier),
        status: g.status,
      };
    }
  }
  return null;
}

module.exports = {
  MIN_BET,
  TOTAL_TILES,
  calculateMultiplier,
  startMines,
  revealTile,
  cashoutMines,
  getActiveMinesGame,
};
