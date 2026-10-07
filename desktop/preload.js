'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  sendAction: (action, payload) => ipcRenderer.send('action', { action, payload }),
  notify: (title, body) => ipcRenderer.send('show-notification', { title, body }),
});
