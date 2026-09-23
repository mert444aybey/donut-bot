'use strict';

const MIN_BET = 1000;
const COINFLIP_MULTIPLIER = 1.95; // %5 Kasa Avantajı (House Edge)

function playCoinflip(user, betAmount, choice) {
  const bet = Math.round(Number(betAmount));
  if (isNaN(bet) || bet < MIN_BET) {
    throw new Error(`Minimum bahis $${MIN_BET.toLocaleString()} olmalıdır.`);
  }

  if (user.balance < bet) {
    throw new Error('Yetersiz bakiye!');
  }

  const cleanChoice = String(choice || '').toLowerCase().trim();
  if (cleanChoice !== 'heads' && cleanChoice !== 'tails') {
    throw new Error('Geçersiz seçim! "heads" (Yazı) veya "tails" (Tura) seçilmelidir.');
  }

  // 50/50 Rastgelelik
  const resultSide = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = resultSide === cleanChoice;

  let payout = 0;
  let profit = 0;

  if (won) {
    payout = Math.round(bet * COINFLIP_MULTIPLIER);
    profit = payout - bet;
  } else {
    profit = -bet;
  }

  return {
    game: 'coinflip',
    bet,
    choice: cleanChoice,
    resultSide,
    won,
    multiplier: won ? COINFLIP_MULTIPLIER : 0,
    payout,
    profit,
  };
}

module.exports = {
  MIN_BET,
  COINFLIP_MULTIPLIER,
  playCoinflip,
};
