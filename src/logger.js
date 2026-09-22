'use strict';

const state = require('./state');

const logBuffer = [];

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('tr-TR', { hour12: false })}] ${msg}`;
  console.log(line);
  logBuffer.push(line);
  if (logBuffer.length > 300) logBuffer.shift();
  if (state.io) state.io.emit('log', line);
}

// Sadece "Ayrintili log" aciksa yazar
function dlog(msg) {
  if (state.S && state.S.verbose) log(msg);
}

module.exports = { log, dlog, logBuffer };
