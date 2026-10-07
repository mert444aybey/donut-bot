'use strict';

const path = require('path');
const { app, BrowserWindow, Menu, Tray, Notification, ipcMain, shell } = require('electron');

// 1. Arka Plan Bot Servisini Başlat
require('../src/settings');
require('../src/stats');

const CFG = require('../src/config');
const state = require('../src/state');
const { log } = require('../logger');
const web = require('../src/web/server');
const { createBot, quitBot, joinBot } = require('../src/bot');
const { startAutomation, stopAutomation } = require('../src/features/automation');
const { startWatchdog } = require('../src/features/watchdog');

let mainWindow = null;
let appTray = null;

function sendNotification(title, body) {
  if (!Notification.isSupported()) return;
  try {
    const notif = new Notification({
      title,
      body,
      silent: false,
    });
    notif.show();
  } catch (_) {}
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 980,
    minHeight: 650,
    title: 'Donut Bot · 1B İmparatorluk Masaüstü Uygulaması',
    backgroundColor: '#0b0d10',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const url = `http://127.0.0.1:${CFG.panelPort}`;

  // Sunucu hazır olana kadar bekle ve yükle
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Dış bağlantıları varsayılan tarayıcıda aç
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('http://127.0.0.1') || targetUrl.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  buildAppMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '🚀 İşlemler (Bot)',
      submenu: [
        {
          label: '👑 1B Hedef Modunu Başlat',
          accelerator: 'CmdOrCtrl+1',
          click: () => startAutomation('billionaire'),
        },
        {
          label: '⏯️ Kaldığın Yerden Devam Et',
          accelerator: 'CmdOrCtrl+2',
          click: () => startAutomation('resume'),
        },
        {
          label: '✨ God Helmet Tam Döngü',
          accelerator: 'CmdOrCtrl+3',
          click: () => startAutomation('god_helmet'),
        },
        {
          label: '▶ Normal Tam Döngü',
          accelerator: 'CmdOrCtrl+4',
          click: () => startAutomation('full'),
        },
        { type: 'separator' },
        {
          label: '⏹️ Otomasyonu Durdur',
          accelerator: 'CmdOrCtrl+Space',
          click: () => stopAutomation(),
        },
        { type: 'separator' },
        {
          label: '⚡ Botu Sunucuya Bağla (Join)',
          click: () => joinBot(),
        },
        {
          label: '🚪 Botu Çıkart (Quit)',
          click: () => quitBot(),
        },
      ],
    },
    {
      label: '📄 Sayfalar',
      submenu: [
        {
          label: '🏠 Ana Kontrol Paneli',
          click: () => mainWindow && mainWindow.loadURL(`http://127.0.0.1:${CFG.panelPort}/`),
        },
        {
          label: '⚙️ Ayarlar',
          click: () => mainWindow && mainWindow.loadURL(`http://127.0.0.1:${CFG.panelPort}/settings`),
        },
        {
          label: '🔭 Canlı Keşif & Envanter (/probe)',
          click: () => mainWindow && mainWindow.loadURL(`http://127.0.0.1:${CFG.panelPort}/probe`),
        },
        {
          label: '📖 Muhasebe & Kâr Defteri (/ledger)',
          click: () => mainWindow && mainWindow.loadURL(`http://127.0.0.1:${CFG.panelPort}/ledger`),
        },
        {
          label: '📊 Detaylı İstatistikler (/stats)',
          click: () => mainWindow && mainWindow.loadURL(`http://127.0.0.1:${CFG.panelPort}/stats`),
        },
      ],
    },
    {
      label: '👁️ Görünüm',
      submenu: [
        {
          label: '📌 Her Zaman Üstte Tut (Always on Top)',
          type: 'checkbox',
          checked: false,
          click: (item) => {
            if (mainWindow) mainWindow.setAlwaysOnTop(item.checked);
          },
        },
        { type: 'separator' },
        { role: 'reload', label: 'Yenile (F5)' },
        { role: 'forceReload', label: 'Zorla Yenile (Ctrl+F5)' },
        { role: 'toggleDevTools', label: 'Geliştirici Konsolu (F12)' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Yakınlaştırmayı Sıfırla' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
      ],
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: '📦 GitHub Deposu',
          click: () => shell.openExternal('https://github.com/mert444aybey/donut-bot'),
        },
        {
          label: '💡 DonutSMP Web Paneli (Harici Tarayıcıda Aç)',
          click: () => shell.openExternal(`http://127.0.0.1:${CFG.panelPort}`),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Olayları
ipcMain.on('action', (_event, data) => {
  if (!data || !data.action) return;
  switch (data.action) {
    case 'start':
      startAutomation(data.payload || 'billionaire');
      break;
    case 'stop':
      stopAutomation();
      break;
    case 'join':
      joinBot();
      break;
    case 'quit':
      quitBot();
      break;
  }
});

ipcMain.on('show-notification', (_event, data) => {
  if (data && data.title) {
    sendNotification(data.title, data.body || '');
  }
});

// Tekil uygulama örneği koruması (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // 1. Web sunucusunu başlat
    web.start();

    // 2. Bot bağlantısını başlat
    createBot();

    // 3. Masaüstü penceresini oluştur
    createMainWindow();

    // 4. 24/7 Otonom Bekçi Motorunu başlat
    startWatchdog();

    // 5. Canlı satışlarda masaüstü bildirimi gönder
    if (state.io) {
      state.io.on('connection', (socket) => {
        socket.on('notify:sale', (info) => {
          if (!info) return;
          sendNotification(
            '💰 Satış Onaylandı!',
            `${info.amount || 1}x ${info.item} @ $${Number(info.price || 0).toLocaleString()} satıldı! (+Net $${Number(info.profit || 0).toLocaleString()})`
          );
        });
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    // Pencere kapatıldığında botu ve uygulamayı temizce kapat
    try { quitBot(); } catch (_) {}
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
