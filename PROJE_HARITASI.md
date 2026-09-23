# Proje Haritasi

Calistirma: `node index.js` (ilk kez: `npm install`)

Claude'a bir degisiklik yaptirirken **sadece ilgili dosyayi** gonder. Ne kadar az dosya, o kadar az token.

## Hangi degisiklik icin hangi dosya?

| Yapmak istedigin | Dosya |
|---|---|
| Sunucu adresi, slot numaralari, bekleme sureleri, onay slotu (sabit ayarlar) | `src/config.js` |
| Panelde yeni ayar eklemek (varsayilan + dogrulama) | `src/settings.js` + `src/web/pages.js` (settingsPage) |
| Siparis verme adimlari, siparis fiyati hesabi | `src/features/order.js` |
| Siparis tamamlaninca itemleri toplama | `src/features/collect.js` |
| Piyasa (AH) en dusuk fiyati okuma, ucuzlatma hesabi | `src/features/market.js` |
| AH'ta ilan koyma, onay penceresi, satis bekleme | `src/features/sell.js` |
| Tam dongu akisi, otomatik yeniden baslatma, hata yonetimi | `src/features/automation.js` |
| Kesif sayfasinin calismasi (tiklama, chat, tabela) | `src/features/probe.js` |
| Örs yerlestirme, XP sisesi atma, orsle birlestirme | `src/features/anvil.js` |
| God Helmet kask & buyu birlestirme, oto-siparis ve satis | `src/features/craft_helmet.js` |
| Chat mesajlarini yakalama, kick/yeniden baglanma | `src/bot.js` |
| Kar/zarar istatistikleri | `src/stats.js` (+ `src/web/pages.js` statsPage) |
| Panelin gorunumu (renk, yerlesim, yeni sayfa) | `src/web/pages.js` |
| Yeni API/rota eklemek | `src/web/server.js` |

## Dosya listesi

```
index.js                   giris noktasi
src/
  config.js                sabit ayarlar (host, slotlar, gecikmeler)
  settings.js              panel ayarlari: varsayilan, sema, dogrulama, settings.json
  stats.js                 istatistik: stats.json, kar/zarar
  state.js                 paylasilan durum (bot, io, bayraklar) - nadiren degisir
  logger.js                log / dlog
  bot.js                   mineflayer bot, chat dinleyicileri, yeniden baglanma
  features/
    automation.js          ana akis (full / topla+sat / sadece sat), oto-restart
    order.js               siparis ver + siparis fiyati
    collect.js             siparisi topla
    market.js              AH piyasa fiyati
    sell.js                AH'ta ilan koy, satis bekle
    probe.js               kesif sayfasi komutlari
    anvil.js               ors & XP sisesi yonetimi
    craft_helmet.js        god helmet uretimi ve satisi
  utils/
    text.js                NBT/metin cevirme, sleep, baslik
    inspect.js             lore/fiyat okuma, pencere snapshot
    windows.js             pencere bekleme, tiklama, tabela
  web/
    server.js              express + socket.io rotalari
    pages.js               tum HTML/CSS sayfalari
```

## Kural: paylasilan durum

Degisken degerler (bot, ayarlar, calisiyor mu vb.) `state.js` uzerinden okunur: `state.S`, `state.bot`, `state.running`.
`const { S } = state` gibi kopyalama yapma, ayarlar guncellenince eski deger kalir.

## Veri dosyalari

`settings.json` ve `stats.json` proje kokune yazilir (`index.js` ile ayni klasor).
Eski sürümden geciyorsan bu iki dosyayi oldugu gibi birak, yeni kod ayni dosyalari okur.
