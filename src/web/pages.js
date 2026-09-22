'use strict';

// Tum panel sayfalarinin HTML'i burada. Sadece gorunumu degistirecekseniz bu dosya yeterli.

const STYLE = `
:root{
  --bg:#0b0d10; --panel:#14171c; --panel-2:#1b1f26; --border:#262b33;
  --text:#e8eaed; --muted:#8b93a1; --muted-2:#5f6673;
  --accent:#4f8cff; --green:#33c17a; --amber:#e0a530; --red:#e5555a;
  --radius:10px;
}
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:0}
.wrap{max-width:1080px;margin:0 auto;padding:28px 24px 60px}
.header{margin-bottom:6px}
.header h1{font-size:21px;margin:0 0 6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.header .subtitle{color:var(--muted);font-size:13px;margin:0}
nav{display:flex;gap:6px;margin:16px 0 24px;flex-wrap:wrap}
nav a{color:var(--muted);text-decoration:none;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--border);transition:all .15s}
nav a:hover{color:var(--text);background:var(--panel-2)}
nav a.active{color:#fff;background:var(--accent);border-color:var(--accent)}
h2,h3{margin:0 0 10px;font-weight:700}
h3{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:24px}
a{color:var(--accent)}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:18px}
.section{margin-bottom:20px}
button{font-size:14px;font-weight:600;padding:10px 16px;margin:0 8px 8px 0;border:0;border-radius:8px;color:#fff;cursor:pointer;transition:filter .15s,transform .05s}
button:hover{filter:brightness(1.12)}
button:active{transform:scale(.98)}
.green{background:var(--green)}.blue{background:var(--accent)}.amber{background:var(--amber)}.red{background:var(--red)}.gray{background:#2a303a}
.btn-group{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px}
.btn-desc{font-size:12px;color:var(--muted-2);margin:4px 0 0}
#log,#out{margin-top:4px;background:#07090b;padding:14px;height:420px;overflow:auto;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:12.5px;border-radius:var(--radius);border:1px solid var(--border);line-height:1.5}
#out{height:150px}
#log div,#out div{white-space:pre-wrap;word-break:break-word;padding:1px 0}
.badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;background:#20252d;color:var(--muted);border:1px solid var(--border)}
.badge.on{background:rgba(51,193,122,.15);color:var(--green);border-color:rgba(51,193,122,.3)}
.badge.off{background:rgba(229,85,90,.15);color:var(--red);border-color:rgba(229,85,90,.3)}
label{display:block;margin:0 0 4px;font-weight:600;font-size:13.5px}
.hint{display:block;font-size:12px;color:var(--muted);font-weight:400;margin-top:2px}
input[type=text],input[type=number]{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);font-size:14px;font-family:inherit}
input[type=text]:focus,input[type=number]:focus{outline:none;border-color:var(--accent)}
input[type=checkbox],input[type=radio]{transform:scale(1.2);margin-right:7px;accent-color:var(--accent)}
.field{margin-bottom:14px}
.field.checkbox-field label{display:flex;align-items:center;margin:0;font-weight:600;cursor:pointer}
#msg{margin-top:16px;min-height:22px;font-weight:600;font-size:13.5px}
#msg.ok{color:var(--green)}#msg.err{color:var(--red)}
.row{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.row input{flex:1;min-width:140px}
.row button{margin:0;white-space:nowrap}
#grid,#invgrid{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin-top:8px}
.mini-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:6px;max-width:340px}
.cell{background:var(--panel-2);border:1px solid var(--border);border-radius:6px;padding:4px;min-height:54px;font-size:10.5px;cursor:pointer;text-align:left;color:var(--text);margin:0 !important;overflow:hidden;word-break:break-all;transition:border-color .1s}
.cell:hover:not(.empty){border-color:var(--accent);background:#222832}
.cell.empty{opacity:.35;cursor:default}
.cell b{display:block;color:var(--amber);font-size:10px}
.cell.hasprice{border-color:var(--green)}
.cell.hotbar{background:#1f252f}
#details div{font-size:12.5px;margin:2px 0;white-space:pre-wrap}
#details .slot{color:var(--amber);margin-top:10px;font-weight:600}
#details .lore{color:var(--muted);padding-left:14px}
#details .price{color:var(--green);padding-left:14px;font-weight:600}
#signbox{display:none;background:rgba(224,165,48,.08);border:1px solid rgba(224,165,48,.3);padding:14px;border-radius:var(--radius);margin-top:12px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:4px}
.stat-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600}
.stat-value{font-size:25px;font-weight:800;margin-top:6px}
.stat-value.pos{color:var(--green)}
.stat-value.neg{color:var(--red)}
.stat-sub{font-size:12px;color:var(--muted-2);margin-top:4px}
#since{font-size:12.5px;color:var(--muted);margin-top:18px}
.mode-group{display:flex;gap:16px;align-items:center;margin:10px 0 4px;font-size:13px;color:var(--muted);flex-wrap:wrap}
.mode-group>span{font-weight:600;color:var(--text)}
.mode-group label{font-weight:400;display:flex;align-items:center;gap:5px;margin:0;cursor:pointer}
.empty-state{color:var(--muted-2);font-size:13px;padding:16px 0;text-align:center}
.settings-group{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:16px}
.settings-group h3{margin-top:0;padding-top:0;margin-bottom:12px;font-size:14px;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:8px}
.collapsible-header{cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;padding:10px 0}
.collapsible-header:hover{color:var(--accent)}
.balance-banner{display:flex;align-items:center;gap:14px;background:rgba(51,193,122,.08);border:1px solid rgba(51,193,122,.25);border-radius:var(--radius);padding:12px 18px;margin-bottom:16px}
.balance-banner .amount{font-size:22px;font-weight:800;color:var(--green)}
.balance-banner .label{font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em}
.cursor-banner{display:none;background:rgba(79,140,255,.12);border:1px solid rgba(79,140,255,.3);border-radius:8px;padding:8px 14px;font-size:13px;margin:8px 0;font-weight:600;color:var(--accent)}
@media(max-width:640px){.wrap{padding:18px 14px 40px}.cell{font-size:9px;min-height:46px}}
`;

function shell(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} · Orders Bot</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>${STYLE}</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

const NAV_ITEMS = [
  ['/', 'Panel', '🛒'],
  ['/ledger', 'Muhasebe', '💰'],
  ['/settings', 'Ayarlar', '⚙️'],
  ['/probe', 'Kesif', '🔍'],
  ['/stats', 'Istatistik', '📊'],
];

function navHtml(active) {
  return '<nav>' + NAV_ITEMS.map(([href, label, icon]) =>
    `<a href="${href}"${href === active ? ' class="active"' : ''}>${icon} ${label}</a>`
  ).join('') + '</nav>';
}

// ---------------- ANA PANEL ----------------
function homePage() {
  return shell('Panel', `
<div class="header">
  <h1>🛒 Donut SMP Siparis Botu</h1>
  <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
    <span id="botBadge" class="badge off">● Bot: Baglaniyor...</span>
    <span id="badge" class="badge">● Otomasyon: durdu</span>
  </div>
  <p class="subtitle" style="margin-top:6px">Siparis ver, topla - hepsi otomatik calisir.</p>
</div>
${navHtml('/')}

<div class="balance-banner">
  <div>
    <div class="label">💵 CANLI BAKIYE (/bal)</div>
    <div class="amount" id="balAmount">Yukleniyor...</div>
  </div>
  <button class="gray" id="refreshBal" style="padding:6px 12px;font-size:12px;margin:0;margin-left:auto">🔄 Yenile (/bal)</button>
</div>

<div class="card section">
  <div class="btn-group">
    <button class="green" id="start">▶ Tam Dongu</button>
    <button class="blue" id="collect">📦 Sadece Topla</button>
    <button class="amber" id="godHelmet">✨ God Helmet Üret & Sat</button>
    <button class="red" id="stop">■ Durdur</button>
  </div>
  <p class="btn-desc">Tam Dongu: siparis ver → topla. God Helmet: envanterdeki kask ve kitaplarla akilli XP tasarruflu 5 adimli God Helmet uretip AH'de satar.</p>
</div>

<div class="card section">
  <div style="font-size:13px;font-weight:600;margin-bottom:8px">Bot Baglanti Yonetimi</div>
  <div class="btn-group">
    <button class="red" id="btnExit" style="padding:8px 14px;font-size:13px">🚪 Bot Cikis (Exit)</button>
    <button class="green" id="btnJoin" style="padding:8px 14px;font-size:13px">⚡ Bot Giris (Join / Baglan)</button>
  </div>
  <p class="btn-desc">Botu oyundan cikarabilir veya yeniden sunucuya baglayabilirsiniz.</p>
</div>

<h3>Canli Log</h3>
<div id="log"></div>
<script src="/socket.io/socket.io.js"></script>
<script>
var s = io();
var logEl = document.getElementById('log');
var badge = document.getElementById('badge');
var botBadge = document.getElementById('botBadge');
var balAmount = document.getElementById('balAmount');

function add(m){ var d=document.createElement('div'); d.textContent=m; logEl.appendChild(d); logEl.scrollTop=logEl.scrollHeight; }
s.on('history', function(lines){ logEl.innerHTML=''; lines.forEach(add); });
s.on('log', add);

s.on('status', function(r){
  badge.textContent = r ? '● Otomasyon: calisiyor' : '● Otomasyon: durdu';
  badge.className = 'badge' + (r ? ' on' : '');
});

s.on('botStatus', function(online){
  botBadge.textContent = online ? '● Bot: Oyunda' : '● Bot: Bagli Degil';
  botBadge.className = 'badge' + (online ? ' on' : ' off');
});

s.on('balance', function(b){
  if (b !== null && b !== undefined) {
    balAmount.textContent = '$ ' + Number(b).toLocaleString('tr-TR');
  } else {
    balAmount.textContent = 'Bilinmiyor (/bal bekleniyor)';
  }
});

document.getElementById('refreshBal').onclick = function(){ s.emit('queryBalance'); };
document.getElementById('start').onclick = function(){ s.emit('start','full'); };
document.getElementById('collect').onclick = function(){ s.emit('start','collect'); };
document.getElementById('godHelmet').onclick = function(){ s.emit('start','god_helmet'); };
document.getElementById('stop').onclick = function(){ s.emit('stop'); };

document.getElementById('btnExit').onclick = function(){
  if (!confirm('Bot oyundan cikartilsin mi?')) return;
  s.emit('botExit');
};
document.getElementById('btnJoin').onclick = function(){
  s.emit('botJoin');
};
</script>`);
}

// ---------------- AYARLAR ----------------
function settingsPage() {
  return shell('Ayarlar', `
<div class="header"><h1>⚙️ Ayarlar</h1>
<p class="subtitle">Otomasyon calisirken ayar degistirilemez, once panelden DURDUR'a basin.</p></div>
${navHtml('/settings')}

<div class="settings-group">
  <h3>📦 Coklu Item / Portfoy Yonetimi</h3>
  <div class="field checkbox-field" style="margin-bottom:12px">
    <label>
      <input type="checkbox" id="portfolioEnabled">
      <span><b>Coklu Item (Portfoy) Modunu Aktif Et</b></span>
    </label>
    <span class="hint">Acikken bot donguler boyunca asagidaki itemleri sirayla siparis eder ve toplar.</span>
  </div>

  <div id="portfolioList" style="margin-top:10px"></div>

  <div style="background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-top:12px">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--text)">+ Portfoye Yeni Item Ekle:</div>
    <div class="row">
      <input type="text" id="p_item" placeholder="Item Gorunen Adi (orn: Block of Gold)" style="flex:2">
      <input type="text" id="p_itemId" placeholder="ID (orn: gold_block)" style="flex:1">
      <input type="number" id="p_orderAmount" placeholder="Adet (10)" style="flex:1">
      <input type="number" id="p_orderPrice" placeholder="Yedek Alis Fiyati (26000)" style="flex:1">
      <button class="green" id="p_add" type="button">+ Ekle ve Kaydet</button>
    </div>
  </div>
</div>

<div class="settings-group">
  <h3>🎯 Temel Siparis Ayarlari & Outbid Korumasi</h3>
  <div class="field checkbox-field">
    <label>
      <input type="checkbox" id="autoOrderPriceEnabled">
      <span><b>Otomatik Siparis Fiyati (Tavsiye Edilir)</b></span>
    </label>
    <span class="hint">Siparis panosundaki (/order) en yuksek mevcut fiyatin ustune cikarak en one gecer.</span>
  </div>

  <div class="field checkbox-field" style="margin-top:8px">
    <label>
      <input type="checkbox" id="autoOutbidRelist">
      <span><b>Akilli Outbid Korumasi (Onune Gecilirse Siparisi Yenile)</b></span>
    </label>
    <span class="hint">Biri sizden daha yuksek teklif verirse eski siparisi otomatik iptal edip yeni fiyattan acar.</span>
  </div>

  <div class="row" style="margin-top:10px">
    <div style="flex:1">
      <label>Siparis Bekleme / Zaman Asimi (Dakika)</label>
      <input type="number" id="orderTimeoutMin">
      <span class="hint">Bu surede satilmazsa siparis iptal edilip siradakine gecer</span>
    </div>
    <div style="flex:1">
      <label>Piyasa Kontrol Sikligi (Saniye)</label>
      <input type="number" id="outbidCheckIntervalSec">
      <span class="hint">Outbid kontrolu kac saniyede bir yapilsin</span>
    </div>
  </div>

  <div class="row" style="margin-top:10px">
    <div style="flex:1">
      <label>Tekil Mod: Siparis Item Adi</label>
      <input type="text" id="item">
      <span class="hint">Portfoy kapaliyken kullanilir (orn: Block of Gold)</span>
    </div>
    <div style="flex:1">
      <label>Tekil Mod: Item ID</label>
      <input type="text" id="itemId">
      <span class="hint">Envanterde sayilacak ID (orn: gold_block)</span>
    </div>
  </div>

  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Tekil Mod: Siparis Adedi</label>
      <input type="number" id="orderAmount">
    </div>
    <div style="flex:1">
      <label>Tekil Mod: Yedek Siparis Fiyati ($)</label>
      <input type="number" id="orderPrice">
      <span class="hint">Otomatik fiyat kapaliysa veya panoda ilan yoksa bu fiyat verilir</span>
    </div>
  </div>
</div>

<div class="settings-group">
  <h3>🛡️ Guvenlik & Davranis (Anti-Ban / Anti-AFK)</h3>
  <div class="field checkbox-field">
    <label>
      <input type="checkbox" id="humanDelays">
      <span><b>Insansi Rastgele Gecikmeler (Jitter)</b></span>
    </label>
    <span class="hint">Tiklama ve menuler arasi bekleme surelerine dogal insansi sapmalar ekler.</span>
  </div>
  <div class="field checkbox-field" style="margin-top:8px">
    <label>
      <input type="checkbox" id="antiAfk">
      <span><b>Anti-AFK (Hafif Hareketler)</b></span>
    </label>
    <span class="hint">Bosta beklerken hafif kafa cevirme ve cokelme yapar, AFK algilanmasini onler.</span>
  </div>
</div>

<div class="settings-group">
  <h3>✨ God Helmet / Auto-Enchant & Örs Ayarları</h3>
  <div class="row">
    <div style="flex:1">
      <label>God Helmet Satış Fiyatı ($)</label>
      <input type="number" id="godHelmetSellPrice">
      <span class="hint">Piyasada ilan yoksa kullanılan varsayılan satış fiyatı</span>
    </div>
    <div style="flex:1">
      <label>Taban Satış Fiyatı ($)</label>
      <input type="number" id="godHelmetMinSellPrice">
      <span class="hint">Fiyat kırarken inilebilecek en düşük taban koruması</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Ucuzlatma Miktarı (Undercut $)</label>
      <input type="number" id="godHelmetUndercut">
      <span class="hint">En ucuz God Helmet'tan kaç $ ucuza koyulsun</span>
    </div>
    <div style="flex:1">
      <label>Minimum Kâr Garantisi ($)</label>
      <input type="number" id="godHelmetMinProfit">
      <span class="hint">Maliyetin üzerine eklenecek garanti kâr (Zarar önleme)</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>XP Şişesi Sipariş Fiyatı ($)</label>
      <input type="number" id="xpBottleOrderPrice">
      <span class="hint">Envanterde bitince /orders'tan alınacak birim fiyat</span>
    </div>
    <div style="flex:1">
      <label>XP Şişesi Sipariş Miktarı</label>
      <input type="number" id="xpBottleOrderAmount">
      <span class="hint">Tek seferde sipariş edilecek şişe adedi (Örn: 64)</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>🛡️ Elmas Kask Sipariş Fiyatı ($ - Manuel / Sabit)</label>
      <input type="number" id="diamondHelmetOrderPrice">
      <span class="hint">Kask için otomatik fiyat çekilmez; doğrudan bu belirlediğiniz sabit fiyat verilir</span>
    </div>
    <div style="flex:1">
      <label>Blast Protection 4 Kitap ($)</label>
      <input type="number" id="bookBlastOrderPrice">
      <span class="hint">Eksik olunca /orders'tan alınacak fiyat</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Respiration 3 Kitap ($)</label>
      <input type="number" id="bookRespOrderPrice">
      <span class="hint">Eksik olunca /orders'tan alınacak fiyat</span>
    </div>
    <div style="flex:1">
      <label>Mending Kitap ($)</label>
      <input type="number" id="bookMendingOrderPrice">
      <span class="hint">Eksik olunca /orders'tan alınacak fiyat</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Unbreaking 3 Kitap ($)</label>
      <input type="number" id="bookUnbOrderPrice">
      <span class="hint">Eksik olunca /orders'tan alınacak fiyat</span>
    </div>
    <div style="flex:1">
      <label>Aqua Affinity Kitap ($)</label>
      <input type="number" id="bookAquaOrderPrice">
      <span class="hint">Eksik olunca /orders'tan alınacak fiyat</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Örs İçin Tavan Fiyat ($)</label>
      <input type="number" id="godHelmetMaxAnvilPrice">
      <span class="hint">Örs yoksa /ah üzerinden alınabilecek maksimum örs fiyatı</span>
    </div>
  </div>
  <div class="row" style="margin-top:12px">
    <div class="field checkbox-field" style="margin:0">
      <label>
        <input type="checkbox" id="godHelmetAutoBuyAnvil">
        <span><b>Örs Bulunamazsa /ah'den Otomatik Örs Satın Al</b></span>
      </label>
      <span class="hint">Etrafta veya çantada örs kalmadığında AH'den en ucuz örsü çeker ve kurar.</span>
    </div>
  </div>
</div>

<div class="settings-group">
  <div class="collapsible-header" id="advHeader">
    <span style="font-weight:700;font-size:14px;color:var(--muted)">⚙️ Gelismis Teknik Ayarlar</span>
    <span id="advToggle" style="font-size:12px;color:var(--accent)">[Goster ▼]</span>
  </div>
  <div id="advBody" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
    <div class="row">
      <div style="flex:1">
        <label>Siparis Fiyati Farki (Markup $)</label>
        <input type="number" id="orderMarkup">
        <span class="hint">En yuksek fiyatin kac $ ustune cikilsin (varsayilan: 100)</span>
      </div>
      <div style="flex:1">
        <label>Maksimum Siparis Fiyati Tavani ($)</label>
        <input type="number" id="maxOrderPrice">
        <span class="hint">Otomatik fiyat bu siniri asla gecmez</span>
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <div style="flex:1">
        <label>Siparis Panosu Arama Komutu</label>
        <input type="text" id="orderSearchCmd">
        <span class="hint">Varsayilan: /order</span>
      </div>
      <div style="flex:1">
        <label>Tiklama Gecikmesi (ms)</label>
        <input type="number" id="clickDelayMs">
        <span class="hint">Slot tiklamalari arasi bekleme</span>
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <div style="flex:1">
        <label>Dongu Sayisi (0 = Sonsuz)</label>
        <input type="number" id="maxCycles">
      </div>
      <div style="flex:1;display:flex;align-items:center;margin-top:20px">
        <div class="field checkbox-field" style="margin:0">
          <label>
            <input type="checkbox" id="verbose">
            <span>Ayrintili Konsol Loglari</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</div>

<div style="margin-top:20px">
  <button class="green" id="save" style="padding:12px 24px;font-size:15px">💾 AYARLARI KAYDET</button>
  <button class="gray" id="reset" style="padding:12px 18px">Varsayilana Don</button>
</div>
<div id="msg"></div>

<script>
var FIELDS = [
  ['item', 'text'],
  ['itemId', 'text'],
  ['orderAmount', 'number'],
  ['orderPrice', 'number'],
  ['autoOrderPriceEnabled', 'checkbox'],
  ['autoOutbidRelist', 'checkbox'],
  ['orderTimeoutMin', 'number'],
  ['outbidCheckIntervalSec', 'number'],
  ['orderMarkup', 'number'],
  ['maxOrderPrice', 'number'],
  ['orderSearchCmd', 'text'],
  ['clickDelayMs', 'number'],
  ['maxCycles', 'number'],
  ['humanDelays', 'checkbox'],
  ['antiAfk', 'checkbox'],
  ['portfolioEnabled', 'checkbox'],
  ['verbose', 'checkbox'],
  ['godHelmetSellPrice', 'number'],
  ['godHelmetMinSellPrice', 'number'],
  ['godHelmetUndercut', 'number'],
  ['godHelmetAutoBuyAnvil', 'checkbox'],
  ['godHelmetMaxAnvilPrice', 'number'],
  ['godHelmetMinProfit', 'number'],
  ['xpBottleOrderPrice', 'number'],
  ['xpBottleOrderAmount', 'number'],
  ['diamondHelmetOrderPrice', 'number'],
  ['bookBlastOrderPrice', 'number'],
  ['bookRespOrderPrice', 'number'],
  ['bookMendingOrderPrice', 'number'],
  ['bookUnbOrderPrice', 'number'],
  ['bookAquaOrderPrice', 'number']
];

var inputs = {};
FIELDS.forEach(function(f){ inputs[f[0]] = document.getElementById(f[0]); });

var currentPortfolio = [];
var msg = document.getElementById('msg');

// Gelismis ayarlar akordeon
var advOpen = false;
document.getElementById('advHeader').onclick = function(){
  advOpen = !advOpen;
  document.getElementById('advBody').style.display = advOpen ? 'block' : 'none';
  document.getElementById('advToggle').textContent = advOpen ? '[Gizle ▲]' : '[Goster ▼]';
};

function renderPortfolio(){
  var plist = document.getElementById('portfolioList');
  plist.innerHTML = '';
  if (!currentPortfolio.length) {
    plist.innerHTML = '<div class="empty-state">Portfoyde henuz item yok. Asagidaki formu kullanarak ekleyebilirsiniz.</div>';
    return;
  }
  currentPortfolio.forEach(function(it, idx){
    var card = document.createElement('div');
    card.style = 'background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px';
    var txt = document.createElement('div');
    txt.innerHTML = '<b>' + (idx + 1) + '. ' + it.item + '</b> <span style="color:var(--muted)">(' + it.itemId + ')</span> &nbsp;—&nbsp; <span style="color:var(--green)">' + it.orderAmount + ' adet @ $' + Number(it.orderPrice || 0).toLocaleString() + '</span>';
    var delBtn = document.createElement('button');
    delBtn.className = 'red';
    delBtn.style = 'padding:5px 12px;font-size:12px;margin:0';
    delBtn.textContent = '🗑️ Sil';
    delBtn.onclick = function(){
      currentPortfolio.splice(idx, 1);
      renderPortfolio();
      saveAll(true);
    };
    card.appendChild(txt);
    card.appendChild(delBtn);
    plist.appendChild(card);
  });
}

document.getElementById('p_add').onclick = function(){
  var name = document.getElementById('p_item').value.trim();
  var id = document.getElementById('p_itemId').value.trim().toLowerCase().replace(/^minecraft:/, '');
  var amount = Number(document.getElementById('p_orderAmount').value) || 10;
  var oPrice = Number(document.getElementById('p_orderPrice').value) || 26000;
  if (!name || !id) return alert('Lutfen Item Adi ve Item ID girin.');

  currentPortfolio.push({
    item: name,
    itemId: id,
    orderAmount: amount,
    orderPrice: oPrice
  });

  document.getElementById('p_item').value = '';
  document.getElementById('p_itemId').value = '';
  document.getElementById('p_orderAmount').value = '';
  document.getElementById('p_orderPrice').value = '';
  renderPortfolio();
  saveAll(true);
};

function fill(s){
  FIELDS.forEach(function(f){
    var el = inputs[f[0]];
    if (!el) return;
    if (f[1] === 'checkbox') el.checked = !!s[f[0]];
    else el.value = s[f[0]] !== undefined ? s[f[0]] : '';
  });
  currentPortfolio = Array.isArray(s.portfolio) ? s.portfolio : [];
  renderPortfolio();
}

function collect(){
  var o = {};
  FIELDS.forEach(function(f){
    var el = inputs[f[0]];
    if (!el) return;
    if (f[1] === 'checkbox') o[f[0]] = el.checked;
    else if (f[1] === 'number') o[f[0]] = Number(el.value);
    else o[f[0]] = el.value;
  });
  o.portfolio = currentPortfolio;
  return o;
}

function show(text, ok){
  msg.textContent = text;
  msg.className = ok ? 'ok' : 'err';
  setTimeout(function(){ if (ok) msg.textContent = ''; }, 4000);
}

function send(url, body){
  return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body || {}) })
    .then(function(r){ return r.json().then(function(j){ return { status:r.status, data:j }; }); });
}

function saveAll(silent){
  send('/api/settings', collect()).then(function(r){
    if (r.data.ok) {
      fill(r.data.settings);
      if (!silent) show('✅ Ayarlar basariyla kaydedildi.', true);
    } else {
      show('❌ Hata: ' + (r.data.errors || ['Bilinmeyen hata']).join(' | '), false);
    }
  }).catch(function(e){ show('❌ Istek basarisiz: ' + e.message, false); });
}

fetch('/api/settings').then(function(r){ return r.json(); }).then(fill);
document.getElementById('save').onclick = function(){ saveAll(false); };
document.getElementById('reset').onclick = function(){
  if (!confirm('Varsayilan ayarlara donulecek. Emin misiniz?')) return;
  send('/api/settings/reset').then(function(r){
    if (r.data.ok) { fill(r.data.settings); show('Varsayilan ayarlar yuklendi.', true); }
    else show((r.data.errors || ['Hata']).join(' | '), false);
  });
};
</script>`);
}

// ---------------- KESIF ----------------
function probePage() {
  return shell('Kesif', `
<div class="header"><h1>🔍 Canli Kesif & Envanter Yonetimi</h1>
<p class="subtitle">Botun envanterini ve sunucudaki acik sandik / GUI menulerini canli goruntuleyip kontrol edin.</p></div>
${navHtml('/probe')}

<div class="card section">
  <div class="row">
    <input type="text" id="chat" placeholder="Sohbet / komut yaz: /orders, /order gold_block, /bal, /spawn ...">
    <button class="blue" id="send">GONDER</button>
  </div>
  <div class="row" style="margin-top:6px">
    <button class="green" id="refresh">🔄 YENILE</button>
    <button class="red" id="close">✖ PENCEREYI KAPAT</button>
    <button class="amber" id="copy">📋 VERIYI KOPYALA</button>
    <label style="margin:0;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;margin-left:auto;cursor:pointer">
      <input type="checkbox" id="autoRefresh" checked> Otomatik Canli Yenileme (2sn)
    </label>
  </div>
  <div class="mode-group" style="margin-top:8px">
    <span>Tiklama Modu:</span>
    <label><input type="radio" name="clickmode" value="normal" checked> Normal (Al / Birak)</label>
    <label><input type="radio" name="clickmode" value="shift"> Shift-Click (Hizli Tasi)</label>
    <label><input type="radio" name="clickmode" value="right"> Sag Tik (Yari Yigin)</label>
  </div>
</div>

<div id="cursorBanner" class="cursor-banner"></div>

<div id="signbox">
  <b>Tabela Editoru Acik.</b> Yazilacak metin:
  <div class="row" style="margin-top:6px">
    <input type="text" id="signtext" placeholder="ornek: Block of Gold">
    <button class="green" id="signsend">TABELAYA YAZ VE GONDER</button>
  </div>
</div>

<div id="windowSection" style="display:none;margin-bottom:16px">
  <h3 id="wtitle" style="color:var(--accent)">Acik Pencere</h3>
  <div id="grid"></div>
</div>

<h3>Oyuncu Envanteri (Slotlar 9-35 Ana Envanter, Alt Satir Hotbar)</h3>
<div id="invgrid"></div>
<div id="armorRow" class="mini-grid" style="display:none"></div>

<h3 style="margin-top:20px">Item Ayrintilari (Lore & Fiyat)</h3>
<div id="details"></div>

<h3 style="margin-top:20px">Kesif Cikti Logu</h3>
<div id="out"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
var s = io();
var snap = null;
var out = document.getElementById('out');
var grid = document.getElementById('grid');
var invgrid = document.getElementById('invgrid');
var armorRow = document.getElementById('armorRow');
var windowSection = document.getElementById('windowSection');
var details = document.getElementById('details');
var wtitle = document.getElementById('wtitle');
var cursorBanner = document.getElementById('cursorBanner');
var autoRefreshTimer = null;

function addOut(m){ var d=document.createElement('div'); d.textContent=m; out.appendChild(d); out.scrollTop=out.scrollHeight; }

function currentMode(){
  var el = document.querySelector('input[name=clickmode]:checked');
  return el ? el.value : 'normal';
}

function sendClick(slot){
  s.emit('probe', { type:'click', slot:slot, mode:currentMode() });
}

function renderGrid(container, items, hotbarFrom){
  container.innerHTML = '';
  if (!items) return;
  items.forEach(function(it, idx){
    var b = document.createElement('button');
    var isHotbar = typeof hotbarFrom === 'number' && idx >= hotbarFrom;
    b.className = 'cell' + (it.empty ? ' empty' : '') + (!it.empty && it.prices && it.prices.length ? ' hasprice' : '') + (isHotbar ? ' hotbar' : '');
    if (!it.empty) {
      var lbl = document.createElement('b'); lbl.textContent = '[' + it.slot + ']';
      b.appendChild(lbl);
      b.appendChild(document.createTextNode(it.name + (it.count > 1 ? ' x' + it.count : '')));
      b.title = it.display;
    } else {
      b.textContent = '[' + it.slot + ']';
    }
    b.onclick = function(){ sendClick(it.slot); };
    container.appendChild(b);
  });
}

function render(){
  details.innerHTML = '';

  if (!snap) {
    windowSection.style.display = 'none';
    invgrid.innerHTML = '<div class="empty-state">Bot henuz oyunda degil ya da baglanti bekleniyor. "Yenile" butonuna basin.</div>';
    armorRow.style.display = 'none';
    cursorBanner.style.display = 'none';
    return;
  }

  // Imleçte tutulan item
  if (snap.cursorItem) {
    cursorBanner.style.display = 'block';
    cursorBanner.textContent = '📌 Fare Imlecinde Tutulan Item: ' + snap.cursorItem.display + ' x' + snap.cursorItem.count + ' (Birakmak icin bir slota tiklayin)';
  } else {
    cursorBanner.style.display = 'none';
  }

  // Acik pencere (sandik / menu)
  if (snap.isChest) {
    windowSection.style.display = 'block';
    wtitle.textContent = 'Acik Pencere: "' + snap.title + '" (' + (snap.type || 'menu') + ')';
    renderGrid(grid, snap.container);
  } else {
    windowSection.style.display = 'none';
  }

  renderGrid(invgrid, snap.inventory, 27);

  if (!snap.isChest && snap.armor) {
    armorRow.style.display = 'grid';
    renderGrid(armorRow, snap.armor);
  } else {
    armorRow.style.display = 'none';
  }

  var all = [].concat(snap.container || [], snap.inventory || [], snap.armor || []);
  var any = false;
  all.forEach(function(it){
    if (it.empty) return;
    any = true;
    var h = document.createElement('div'); h.className='slot';
    h.textContent = '[' + it.slot + '] ' + it.name + ' x' + it.count + ' | ' + it.display;
    details.appendChild(h);
    it.lore.forEach(function(l){ var d=document.createElement('div'); d.className='lore'; d.textContent=l; details.appendChild(d); });
    if (it.prices.length) {
      var p=document.createElement('div'); p.className='price';
      p.textContent = 'Fiyat adaylari: ' + it.prices.map(function(x){ return x.raw + ' = ' + x.value; }).join(', ');
      details.appendChild(p);
    }
  });
  if (!any) {
    var e = document.createElement('div'); e.className='empty-state'; e.textContent = 'Gosterilecek dolu slot yok.';
    details.appendChild(e);
  }
}

function asText(){
  if (!snap) return 'Veri yok';
  var lines = [];
  if (snap.isChest) lines.push('ACIK PENCERE: "' + snap.title + '" (' + snap.type + ')');
  var all = [].concat(snap.container || [], snap.inventory || [], snap.armor || []);
  all.forEach(function(it){
    if (it.empty) return;
    lines.push('[' + it.slot + '] ' + it.name + ' x' + it.count + ' | ' + it.display);
    it.lore.forEach(function(l){ lines.push('      ' + l); });
  });
  return lines.join('\\n');
}

// Otomatik yenileme varsayilan acik
function startAutoRefresh(){
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(function(){ s.emit('probe', { type:'refresh' }); }, 2000);
}
startAutoRefresh();

document.getElementById('autoRefresh').onchange = function(){
  if (this.checked) {
    s.emit('probe', { type:'refresh' });
    startAutoRefresh();
  } else {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  }
};

s.on('probe:snapshot', function(w){ snap = w; render(); });
s.on('probe:msg', addOut);
s.on('probe:chat', function(m){ addOut('chat: ' + m); });
s.on('probe:sign', function(open){
  document.getElementById('signbox').style.display = open ? 'block' : 'none';
  if (open) addOut('Tabela editoru acildi.');
});

function sendChat(){
  var el = document.getElementById('chat');
  var t = el.value.trim();
  if (!t) return;
  s.emit('probe', { type:'chat', text:t });
  el.value = '';
}
document.getElementById('send').onclick = sendChat;
document.getElementById('chat').onkeydown = function(e){ if (e.key === 'Enter') sendChat(); };
document.getElementById('refresh').onclick = function(){ s.emit('probe', { type:'refresh' }); };
document.getElementById('close').onclick = function(){ s.emit('probe', { type:'close' }); };
document.getElementById('signsend').onclick = function(){
  s.emit('probe', { type:'sign', text: document.getElementById('signtext').value });
};
document.getElementById('copy').onclick = function(){
  var t = asText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function(){ addOut('Panoya kopyalandi.'); }, function(){ addOut(t); });
  } else { addOut(t); }
};
</script>`);
}

// ---------------- ISTATISTIK ----------------
function statsPage() {
  return shell('Istatistik', `
<div class="header"><h1>📊 Canli Analiz & Istatistikler</h1>
<p class="subtitle">Bakiye degisimi, toplam harcamalar ve toplanan esyalarin gorsel grafigi.</p></div>
${navHtml('/stats')}

<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">Canli Bakiye (/bal)</div><div class="stat-value pos" id="balanceStat">$0</div><div class="stat-sub">Sunucudaki mevcut bakiye</div></div>
  <div class="stat-card"><div class="stat-label">Toplam Harcama</div><div class="stat-value" id="spent">0</div><div class="stat-sub" id="ordersSub">0 siparis</div></div>
  <div class="stat-card"><div class="stat-label">Tamamlanan Dongu</div><div class="stat-value" id="cycles">0</div><div class="stat-sub">Basariyla toplanan</div></div>
</div>

<h3 style="margin-top:24px">📈 Bakiye & Harcama Trendi (Canli)</h3>
<div class="card" style="padding:16px;height:280px;position:relative">
  <canvas id="balanceChart"></canvas>
</div>

<h3 style="margin-top:24px">📦 Toplanan Esyalar Dagilimi</h3>
<div class="card" style="padding:16px;height:260px;position:relative">
  <canvas id="itemsChart"></canvas>
</div>

<div id="since" style="margin-top:20px"></div>
<button class="red" id="reset" style="margin-top:14px">ISTATISTIGI SIFIRLA</button>

<script src="/socket.io/socket.io.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
var s = io();
var balanceChart = null;
var itemsChart = null;

function fmt(n){ n = Math.round(n || 0); return n.toLocaleString('tr-TR'); }

function initCharts(){
  var ctx1 = document.getElementById('balanceChart').getContext('2d');
  balanceChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Bakiye ($)',
          borderColor: '#33c17a',
          backgroundColor: 'rgba(51, 193, 122, 0.12)',
          fill: true,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 3,
          data: []
        },
        {
          label: 'Toplam Harcanan ($)',
          borderColor: '#e5555a',
          backgroundColor: 'rgba(229, 85, 90, 0.08)',
          fill: true,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 3,
          data: []
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8b93a1', maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#8b93a1',
            callback: function(v){ return '$' + (v >= 1e6 ? (v/1e6).toFixed(1)+'M' : (v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v)); }
          }
        }
      },
      plugins: {
        legend: { labels: { color: '#e8eaed', font: { weight: '600' } } }
      }
    }
  });

  var ctx2 = document.getElementById('itemsChart').getContext('2d');
  itemsChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Toplanan Adet',
        backgroundColor: ['#4f8cff', '#33c17a', '#e0a530', '#a855f7', '#ec4899', '#14b8a6'],
        borderRadius: 6,
        data: []
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#e8eaed' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8b93a1', precision: 0 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

initCharts();

function updateCharts(st){
  if (!st) return;

  // 1. Bakiye & Harcama Cizgi Grafigi
  if (balanceChart && Array.isArray(st.history) && st.history.length > 0) {
    var labels = [];
    var balData = [];
    var spentData = [];
    st.history.forEach(function(pt){
      var d = new Date(pt.time);
      labels.push(d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'));
      balData.push(pt.balance || 0);
      spentData.push(pt.spent || 0);
    });
    balanceChart.data.labels = labels;
    balanceChart.data.datasets[0].data = balData;
    balanceChart.data.datasets[1].data = spentData;
    balanceChart.update();
  }

  // 2. Toplanan Esyalar Grafigi
  if (itemsChart && st.itemsCollected && typeof st.itemsCollected === 'object') {
    var itemLabels = Object.keys(st.itemsCollected);
    var itemCounts = itemLabels.map(function(k){ return st.itemsCollected[k]; });
    itemsChart.data.labels = itemLabels;
    itemsChart.data.datasets[0].data = itemCounts;
    itemsChart.update();
  }
}

function render(st){
  document.getElementById('spent').textContent = '$ ' + fmt(st.totalSpent);
  document.getElementById('ordersSub').textContent = st.ordersPlaced + ' siparis, ' + fmt(st.itemsOrdered) + ' adet';
  document.getElementById('cycles').textContent = st.cyclesCompleted;
  document.getElementById('since').textContent = 'Takip baslangici: ' + new Date(st.startedAt).toLocaleString('tr-TR');
  updateCharts(st);
}

s.on('stats', render);
s.on('balance', function(b){
  document.getElementById('balanceStat').textContent = b !== null && b !== undefined ? ('$ ' + Number(b).toLocaleString('tr-TR')) : 'Bilinmiyor';
});

document.getElementById('reset').onclick = function(){
  if (!confirm('Tum istatistikler sifirlanacak. Emin misin?')) return;
  fetch('/api/stats/reset', { method:'POST' }).then(function(r){ return r.json(); }).then(function(j){ if (j.ok) render(j.stats); });
};
</script>`);
}

// ---------------- MUHASEBE / FINANS ----------------
function ledgerPage() {
  return shell('Muhasebe', `
<div class="header"><h1>💰 Finans & Muhasebe Raporu</h1>
<p class="subtitle">Aldığı ve harcadığı miktarlar, kalem bazlı giderler ve net kâr/zarar dökümü.</p></div>
${navHtml('/ledger')}

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-label">Toplam Gelir (Satışlar)</div>
    <div class="stat-value pos" id="totalEarned">$0</div>
    <div class="stat-sub" id="salesSub">Tüm satış gelirleri</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Toplam Gider (Alımlar)</div>
    <div class="stat-value neg" id="totalSpent">$0</div>
    <div class="stat-sub" id="spentSub">Siparişler, XP şişeleri ve örs</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Net Kâr / Durum</div>
    <div class="stat-value" id="netProfit">$0</div>
    <div class="stat-sub" id="profitSub">Gelir - Gider</div>
  </div>
</div>

<h3 style="margin-top:24px">📊 Kalem Bazlı Harcama & Gelir Dağılımı</h3>
<div id="categoryGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:6px"></div>

<h3 style="margin-top:28px">📋 Canlı İşlem Geçmişi (Ledger Defteri)</h3>
<div class="card" style="padding:0;overflow:hidden;margin-top:6px">
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
      <thead>
        <tr style="background:var(--panel-2);color:var(--muted);border-bottom:1px solid var(--border)">
          <th style="padding:10px 14px">Zaman</th>
          <th style="padding:10px 14px">İşlem Türü</th>
          <th style="padding:10px 14px">Kategori</th>
          <th style="padding:10px 14px">Eşya / Kalem</th>
          <th style="padding:10px 14px">Miktar</th>
          <th style="padding:10px 14px">Birim Fiyat</th>
          <th style="padding:10px 14px">Toplam Tutar</th>
          <th style="padding:10px 14px">Açıklama</th>
        </tr>
      </thead>
      <tbody id="ledgerBody">
        <tr><td colspan="8" style="padding:20px;text-align:center;color:var(--muted-2)">Henüz kayıtlı işlem yok.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
var s = io();

function fmt(n){ n = Math.round(n || 0); return '$' + n.toLocaleString('tr-TR'); }

function updateView(st){
  if (!st) return;
  var earned = st.totalEarned || 0;
  var spent = st.totalSpent || 0;
  var net = earned - spent;

  document.getElementById('totalEarned').textContent = fmt(earned);
  document.getElementById('totalSpent').textContent = fmt(spent);
  var netEl = document.getElementById('netProfit');
  netEl.textContent = (net >= 0 ? '+' : '') + fmt(net);
  netEl.className = 'stat-value ' + (net >= 0 ? 'pos' : 'neg');

  // Kategori kartlari
  var catGrid = document.getElementById('categoryGrid');
  catGrid.innerHTML = '';
  var cats = st.categories || {};
  var catKeys = Object.keys(cats);
  if (!catKeys.length) {
    catGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Henüz kategori bazlı harcama veya gelir oluşmadı.</div>';
  } else {
    catKeys.forEach(function(k){
      var c = cats[k];
      var card = document.createElement('div');
      card.className = 'card';
      card.style = 'background:var(--panel-2);padding:14px';
      var isIncome = (c.earned || 0) > 0;
      var val = isIncome ? c.earned : c.spent;
      card.innerHTML = '<div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">' + k + '</div>' +
                       '<div style="font-size:18px;font-weight:800;margin:6px 0;color:' + (isIncome ? 'var(--green)' : '#e5555a') + '">' + (isIncome ? '+' : '-') + fmt(val) + '</div>' +
                       '<div style="font-size:11px;color:var(--muted-2)">' + (c.count || 0) + ' adet işlem</div>';
      catGrid.appendChild(card);
    });
  }

  // Defter tablosu
  var tb = document.getElementById('ledgerBody');
  var ledger = Array.isArray(st.ledger) ? st.ledger : [];
  if (!ledger.length) {
    tb.innerHTML = '<tr><td colspan="8" style="padding:20px;text-align:center;color:var(--muted-2)">Henüz işlem kaydı yok.</td></tr>';
  } else {
    tb.innerHTML = '';
    ledger.forEach(function(row){
      var tr = document.createElement('tr');
      tr.style = 'border-bottom:1px solid var(--border)';
      var isIncome = row.type === 'INCOME';
      var timeStr = new Date(row.time).toLocaleTimeString('tr-TR');
      tr.innerHTML = '<td style="padding:10px 14px;color:var(--muted);white-space:nowrap">' + timeStr + '</td>' +
                     '<td style="padding:10px 14px"><span class="badge ' + (isIncome ? 'on' : 'off') + '">' + (isIncome ? '🟢 GELİR' : '🔴 GİDER') + '</span></td>' +
                     '<td style="padding:10px 14px;font-weight:600">' + row.category + '</td>' +
                     '<td style="padding:10px 14px;color:var(--amber);font-weight:600">' + row.item + '</td>' +
                     '<td style="padding:10px 14px">' + row.amount + '</td>' +
                     '<td style="padding:10px 14px">' + fmt(row.unitPrice) + '</td>' +
                     '<td style="padding:10px 14px;font-weight:700;color:' + (isIncome ? 'var(--green)' : '#e5555a') + '">' + (isIncome ? '+' : '-') + fmt(row.total) + '</td>' +
                     '<td style="padding:10px 14px;color:var(--muted-2);font-size:11.5px">' + (row.note || '-') + '</td>';
      tb.appendChild(tr);
    });
  }
}

s.on('stats', updateView);
fetch('/api/stats').then(function(r){ return r.json(); }).then(updateView);
</script>`);
}

module.exports = { homePage, ledgerPage, settingsPage, probePage, statsPage };
