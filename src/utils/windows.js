'use strict';

const CFG = require('../config');
const state = require('../state');
const { log, dlog } = require('../logger');
const { sleep, humanSleep, titleOf, filledSlots } = require('./text');

function assertActive(token) {
  if (token !== state.cancelToken) throw new Error('iptal edildi');
}

function waitForWindow(timeoutMs = CFG.windowTimeoutMs) {
  return new Promise((resolve, reject) => {
    const bot = state.bot;
    const timer = setTimeout(() => {
      bot.removeListener('windowOpen', onOpen);
      reject(new Error('pencere acilmadi (zaman asimi)'));
    }, timeoutMs);
    function onOpen(win) {
      clearTimeout(timer);
      setTimeout(() => resolve(win), 350);
    }
    bot.once('windowOpen', onOpen);
  });
}

function waitForSignEditor(timeoutMs = CFG.signWaitMs) {
  return new Promise((resolve, reject) => {
    const client = state.bot._client;
    const timer = setTimeout(() => {
      client.removeListener('open_sign_entity', onSign);
      reject(new Error('tabela editoru acilmadi'));
    }, timeoutMs);
    function onSign(packet) {
      clearTimeout(timer);
      resolve(packet);
    }
    client.once('open_sign_entity', onSign);
  });
}

function submitSign(packet, text) {
  state.bot._client.write('update_sign', {
    location: packet.location,
    isFrontText: packet.isFrontText !== undefined ? packet.isFrontText : true,
    text1: String(text),
    text2: '',
    text3: '',
    text4: '',
  });
}

async function waitForSlot(slot, timeoutMs = CFG.slotWaitMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const w = state.bot.currentWindow;
    if (w && w.slots[slot]) return w.slots[slot];
    await sleep(150);
  }
  return null;
}

async function safeClick(slot) {
  const bot = state.bot;
  if (!bot.currentWindow) throw new Error(`slot ${slot} icin acik pencere yok`);

  const item = await waitForSlot(slot);
  const win = bot.currentWindow;
  if (!win) throw new Error(`slot ${slot} beklenirken pencere kapandi`);

  if (!item) {
    log(`Slot ${slot} bos. Pencere "${titleOf(win)}" dolu slotlar: ${filledSlots(win) || 'HIC'}`);
    throw new Error(`slot ${slot} bos, tiklama iptal edildi`);
  }

  dlog(`Tik: slot ${slot} (${item.displayName || item.name}) | ${titleOf(win)}`);
  await humanSleep(state.S.clickDelayMs);
  await bot.clickWindow(slot, 0, 0);
}

function itemCount(targetItemId) {
  const active = state.getActiveItem ? state.getActiveItem() : (state.S || {});
  const target = targetItemId || active.itemId;
  if (!state.bot || !state.bot.inventory) return 0;
  return state.bot.inventory.items()
    .filter((i) => i.name === target)
    .reduce((sum, i) => sum + i.count, 0);
}

function closeWindowSafe() {
  try {
    const bot = state.bot;
    if (bot && bot.currentWindow) bot.closeWindow(bot.currentWindow);
  } catch (_) {}
}

// AH onay penceresi mi? Once basliga bakar, basarisiz olursa (title decode
// edilemedigi durumlar icin) yapisal olarak da dogrular: onay slotunda yesil/lime
// bir buton VE pencerede satilan item'in onizlemesi varsa yine onay penceresi sayilir.
function isConfirmWindow(win) {
  const title = titleOf(win);
  if (CFG.ahConfirmTitle.test(title)) return true;

  const active = state.getActiveItem ? state.getActiveItem() : (state.S || {});
  const btn = win.slots[CFG.ahConfirmSlot];
  const hasConfirmBtn = !!btn && CFG.ahConfirmItemRegex.test(btn.name);
  const hasItemPreview = win.slots.some((it, i) => i !== CFG.ahConfirmSlot && it && it.name === active.itemId);

  if (hasConfirmBtn && hasItemPreview) {
    dlog(`Baslik eslesmedi ("${title}") ama yapisal kontrolden onay penceresi olarak tanindi.`);
    return true;
  }
  return false;
}

module.exports = {
  assertActive,
  waitForWindow,
  waitForSignEditor,
  submitSign,
  waitForSlot,
  safeClick,
  itemCount,
  closeWindowSafe,
  isConfirmWindow,
};
