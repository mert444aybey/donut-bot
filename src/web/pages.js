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
.badge.listing{background:rgba(224,165,48,.15);color:var(--amber);border-color:rgba(224,165,48,.35)}
.badge.refund{background:rgba(168,85,247,.15);color:#c084fc;border-color:rgba(168,85,247,.35)}
.tab-btn{background:var(--panel-2);border:1px solid var(--border);color:var(--muted);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;transition:all .15s}
.tab-btn:hover{color:var(--text);border-color:var(--accent)}
.tab-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.unit-box{background:var(--panel-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin:16px 0}
.unit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:10px}
.unit-item{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:10px 12px}
.unit-item .u-label{font-size:11px;color:var(--muted);font-weight:600}
.unit-item .u-val{font-size:15px;font-weight:800;color:var(--text);margin-top:4px}
.search-box{background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;width:100%;max-width:320px}
.search-box:focus{outline:none;border-color:var(--accent)}
@media(max-width:640px){.wrap{padding:18px 14px 40px}.cell{font-size:9px;min-height:46px}}
`;

function shell(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} · Orders Bot</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>${STYLE}</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

const NAV_ITEMS = [
  ['/', 'Panel', '🛒'],
  ['/casino', 'Casino', '🎰'],
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

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px">
  <div class="stat-card" style="padding:12px 14px">
    <div class="stat-label">💎 GERÇEKLEŞEN NET KÂR</div>
    <div class="stat-value" id="miniNetProfit" style="font-size:18px">$0</div>
    <div class="stat-sub">Satış Geliri - Gider</div>
  </div>
  <div class="stat-card" style="padding:12px 14px">
    <div class="stat-label">🟢 GERÇEKLEŞEN GELİR</div>
    <div class="stat-value pos" id="miniEarned" style="font-size:18px">$0</div>
    <div class="stat-sub">Onaylı satışlar</div>
  </div>
  <div class="stat-card" style="padding:12px 14px">
    <div class="stat-label">🔴 TOPLAM GİDER</div>
    <div class="stat-value neg" id="miniSpent" style="font-size:18px">$0</div>
    <div class="stat-sub">Sipariş & alımlar</div>
  </div>
  <div class="stat-card" style="padding:12px 14px">
    <div class="stat-label">⏳ İLANDAKİ DEĞER</div>
    <div class="stat-value" id="miniListing" style="font-size:18px;color:var(--amber)">$0</div>
    <div class="stat-sub">AH'de alıcı bekleyen</div>
  </div>
</div>

<div class="card section">
  <div style="font-size:13px;font-weight:600;margin-bottom:8px">⚡ Ana Otomasyon Modları</div>
  <div class="btn-group">
    <button class="blue" id="resume" style="background:#0284c7;color:#fff">⏯️ Kaldığın Yerden Devam Et</button>
    <button class="amber" id="godHelmet">✨ God Helmet Tam Döngü</button>
    <button class="green" id="start">▶ Tam Dongu</button>
    <button class="red" id="stop">■ Durdur</button>
  </div>
  <p class="btn-desc"><b>Kaldığın Yerden Devam Et:</b> Envanter ve depo durumunu analiz eder; yarım kalan örs birleştirmesini, satışını veya döngüsünü akıllıca kaldığı aşamadan sürdürür.<br>
  <b>God Helmet:</b> 5'li toplu malzeme siparişi/toplama + 5 adımlı örs birleştirme + AH satışı.</p>
</div>

<div class="card section">
  <div style="font-size:13px;font-weight:600;margin-bottom:8px">🧪 Moduler Test Butonları (Tek Seferlik Test)</div>
  <div class="btn-group">
    <button class="blue" id="testCollect" style="background:#2563eb;color:#fff">📦 Sadece Depodan Topla</button>
    <button class="purple" id="testCraft" style="background:#7c3aed;color:#fff">🔨 Sadece Örste Birleştir</button>
    <button class="emerald" id="testSell" style="background:#059669;color:#fff">🏷️ Sadece God Helmet Sat</button>
  </div>
  <p class="btn-desc"><b>Sadece Depodan Topla:</b> /orders panosundan teslim edilen malzemeleri çeker ve tüm menü slotlarını loglar.<br>
  <b>Sadece Örste Birleştir:</b> Sipariş vermeden, envanterdeki mevcut kask/kitaplarla 5 adımlı örs birleştirmesini test eder.<br>
  <b>Sadece God Helmet Sat:</b> Envanterdeki hazır God Helmet'ı ele alıp /ah piyasa kontrolü ve zarar korumasıyla listeler.</p>
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

s.on('stats', function(st){
  if (!st) return;
  var earned = st.totalEarned || 0;
  var spent = st.totalSpent || 0;
  var net = earned - spent;
  var listing = st.activeListingValue || 0;

  var netEl = document.getElementById('miniNetProfit');
  if (netEl) {
    netEl.textContent = (net >= 0 ? '+' : '') + '$' + Math.round(net).toLocaleString('tr-TR');
    netEl.className = 'stat-value ' + (net >= 0 ? 'pos' : 'neg');
  }
  var earnEl = document.getElementById('miniEarned');
  if (earnEl) earnEl.textContent = '$' + Math.round(earned).toLocaleString('tr-TR');
  var spentEl = document.getElementById('miniSpent');
  if (spentEl) spentEl.textContent = '$' + Math.round(spent).toLocaleString('tr-TR');
  var listEl = document.getElementById('miniListing');
  if (listEl) listEl.textContent = '$' + Math.round(listing).toLocaleString('tr-TR');
});

fetch('/api/stats').then(function(r){ return r.json(); }).then(function(st){
  if (st && s) s.emit('getStats', st);
  if (st) {
    var earned = st.totalEarned || 0;
    var spent = st.totalSpent || 0;
    var net = earned - spent;
    var netEl = document.getElementById('miniNetProfit');
    if (netEl) {
      netEl.textContent = (net >= 0 ? '+' : '') + '$' + Math.round(net).toLocaleString('tr-TR');
      netEl.className = 'stat-value ' + (net >= 0 ? 'pos' : 'neg');
    }
    var earnEl = document.getElementById('miniEarned');
    if (earnEl) earnEl.textContent = '$' + Math.round(earned).toLocaleString('tr-TR');
    var spentEl = document.getElementById('miniSpent');
    if (spentEl) spentEl.textContent = '$' + Math.round(spent).toLocaleString('tr-TR');
    var listEl = document.getElementById('miniListing');
    if (listEl) listEl.textContent = '$' + Math.round(st.activeListingValue || 0).toLocaleString('tr-TR');
  }
});

document.getElementById('refreshBal').onclick = function(){ s.emit('queryBalance'); };
document.getElementById('resume').onclick = function(){ s.emit('resume'); };
document.getElementById('start').onclick = function(){ s.emit('start','full'); };
document.getElementById('godHelmet').onclick = function(){ s.emit('start','god_helmet'); };
document.getElementById('stop').onclick = function(){ s.emit('stop'); };
document.getElementById('testCollect').onclick = function(){ s.emit('start','god_helmet_collect'); };
document.getElementById('testCraft').onclick = function(){ s.emit('start','god_helmet_craft'); };
document.getElementById('testSell').onclick = function(){ s.emit('start','god_helmet_sell'); };

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
      <input type="number" id="p_orderPrice" placeholder="Siparis Fiyati (Büyülü/Sabit) (26000)" style="flex:1">
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
      <label>Tekil Mod: Sabit / Büyülü Eşya Sipariş Fiyatı ($)</label>
      <input type="number" id="orderPrice">
      <span class="hint">Normal eşyalarda fiyat canlı /orders panosundan çekilir. Büyülü eşyalar veya sabit fiyat modu için bu değer kullanılır.</span>
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
      <label>XP Şişesi Sipariş Miktarı</label>
      <input type="number" id="xpBottleOrderAmount">
      <span class="hint">Tek seferde sipariş edilecek şişe adedi (Daima 3200)</span>
    </div>
    <div style="flex:1">
      <label>🛡️ Elmas Kask Sipariş Fiyatı ($ - Manuel / Sabit)</label>
      <input type="number" id="diamondHelmetOrderPrice">
      <span class="hint">Kask için belirlenen sabit sipariş birim fiyatı</span>
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Blast Protection 4 Kitap ($)</label>
      <input type="number" id="bookBlastOrderPrice">
    </div>
    <div style="flex:1">
      <label>Respiration 3 Kitap ($)</label>
      <input type="number" id="bookRespOrderPrice">
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Mending Kitap ($)</label>
      <input type="number" id="bookMendingOrderPrice">
    </div>
    <div style="flex:1">
      <label>Unbreaking 3 Kitap ($)</label>
      <input type="number" id="bookUnbOrderPrice">
    </div>
  </div>
  <div class="row" style="margin-top:8px">
    <div style="flex:1">
      <label>Aqua Affinity Kitap ($)</label>
      <input type="number" id="bookAquaOrderPrice">
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
<div class="header">
  <h1>💰 Finans & Muhasebe Raporu</h1>
  <p class="subtitle">Gerçekleşen satış gelirleri, kalem bazlı malzeme maliyetleri (COGS) ve net nakit kâr dökümü.</p>
</div>
${navHtml('/ledger')}

<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
  <div class="stat-card" style="border-left:4px solid var(--accent)">
    <div class="stat-label">💎 GERÇEKLEŞEN NET KÂR</div>
    <div class="stat-value" id="netProfit">$0</div>
    <div class="stat-sub" id="profitSub">Kasa Kazancı (Gelir - Gider)</div>
  </div>
  <div class="stat-card" style="border-left:4px solid var(--green)">
    <div class="stat-label">🟢 GERÇEKLEŞEN SATIŞ GELİRİ</div>
    <div class="stat-value pos" id="totalEarned">$0</div>
    <div class="stat-sub" id="salesSub">Onaylanan satış cirosu</div>
  </div>
  <div class="stat-card" style="border-left:4px solid var(--red)">
    <div class="stat-label">🔴 TOPLAM MALZEME GİDERİ</div>
    <div class="stat-value neg" id="totalSpent">$0</div>
    <div class="stat-sub" id="spentSub">Kask, Kitap, XP, Örs alımları</div>
  </div>
  <div class="stat-card" style="border-left:4px solid var(--amber)">
    <div class="stat-label">⏳ İLANDAKİ BEKLEYEN DEĞER</div>
    <div class="stat-value" id="activeListingValue" style="color:var(--amber)">$0</div>
    <div class="stat-sub" id="listingSub">AH'de alıcı bekleyen ilanlar</div>
  </div>
</div>

<!-- GOD HELMET BİRİM MALİYET & EKONOMİ KUTUSU (COGS) -->
<div class="unit-box">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div>
      <h3 style="margin:0;color:var(--text);font-size:15px;display:flex;align-items:center;gap:8px">
        🪖 God Helmet Birim Maliyet & Kârlılık Analizi (COGS)
      </h3>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">
        1 adet 5 büyülü God Helmet üretip satarken kalem bazında ne kadar harcanıyor?
      </div>
    </div>
    <span class="badge on" id="marginBadge" style="font-size:12.5px;padding:6px 14px">%86+ Kâr Marjı</span>
  </div>

  <div class="unit-grid">
    <div class="unit-item">
      <div class="u-label">🪖 Elmas Kask</div>
      <div class="u-val" id="ecoHelmet">$25.000</div>
    </div>
    <div class="unit-item">
      <div class="u-label">📚 5x Büyülü Kitap</div>
      <div class="u-val" id="ecoBooks">$80.000</div>
    </div>
    <div class="unit-item">
      <div class="u-label">🧪 ~50x XP Şişesi</div>
      <div class="u-val" id="ecoXp">$12.500</div>
    </div>
    <div class="unit-item">
      <div class="u-label">🔨 Örs Aşınma Payı</div>
      <div class="u-val" id="ecoAnvil">$3.000</div>
    </div>
    <div class="unit-item" style="border-color:rgba(229,85,90,.4);background:rgba(229,85,90,.06)">
      <div class="u-label" style="color:var(--red)">🏷️ BİRİM MALİYET</div>
      <div class="u-val" id="ecoTotalCost" style="color:var(--red)">~$120.500</div>
    </div>
    <div class="unit-item" style="border-color:rgba(51,193,122,.4);background:rgba(51,193,122,.06)">
      <div class="u-label" style="color:var(--green)">📈 AH SATIŞ FİYATI</div>
      <div class="u-val" id="ecoSellPrice" style="color:var(--green)">~$900.000</div>
    </div>
    <div class="unit-item" style="border-color:rgba(79,140,255,.4);background:rgba(79,140,255,.06)">
      <div class="u-label" style="color:var(--accent)">💎 KASK BAŞI NET KÂR</div>
      <div class="u-val" id="ecoProfit" style="color:var(--accent)">+$779.500</div>
    </div>
  </div>
</div>

<h3 style="margin-top:24px">📊 Kalem Bazlı Harcama & Gelir Dağılımı</h3>
<div id="categoryGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:6px"></div>

<!-- AKTİF İLANLAR BÖLÜMÜ -->
<div id="activeListingsSection" style="margin-top:26px;display:none">
  <h3 style="display:flex;align-items:center;gap:8px">
    ⏳ AH Üzerindeki Aktif İlanlar (Satış Bekleyenler)
    <span class="badge listing" id="activeListingsCount">0 İlan</span>
  </h3>
  <div class="card" style="padding:0;overflow:hidden;margin-top:6px">
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left">
        <thead>
          <tr style="background:var(--panel-2);color:var(--muted);border-bottom:1px solid var(--border)">
            <th style="padding:10px 14px">İlan Zamanı</th>
            <th style="padding:10px 14px">Eşya</th>
            <th style="padding:10px 14px">Miktar</th>
            <th style="padding:10px 14px">Liste Satış Fiyatı</th>
            <th style="padding:10px 14px">Birim Maliyet</th>
            <th style="padding:10px 14px">Beklenen Net Kâr</th>
            <th style="padding:10px 14px">Durum</th>
          </tr>
        </thead>
        <tbody id="activeListingsBody"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- CANLI İŞLEM GEÇMİŞİ (LEDGER DEFTERİ) -->
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:30px">
  <h3 style="margin:0">📋 Canlı İşlem Geçmişi (Muhasebe Defteri)</h3>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <input type="text" id="ledgerSearch" class="search-box" placeholder="🔍 Eşya, kategori veya not ara...">
  </div>
</div>

<!-- Filtre Sekmeleri -->
<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
  <button type="button" class="tab-btn active" data-filter="ALL">Tümü (<span id="countAll">0</span>)</button>
  <button type="button" class="tab-btn" data-filter="INCOME">🟢 Satış Gelirleri (<span id="countIncome">0</span>)</button>
  <button type="button" class="tab-btn" data-filter="EXPENSE">🔴 Malzeme Giderleri (<span id="countExpense">0</span>)</button>
  <button type="button" class="tab-btn" data-filter="LISTING">🟡 Aktif İlanlar (<span id="countListing">0</span>)</button>
  <button type="button" class="tab-btn" data-filter="REFUND">🔄 İadeler (<span id="countRefund">0</span>)</button>
</div>

<div class="card" style="padding:0;overflow:hidden;margin-top:8px">
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left">
      <thead>
        <tr style="background:var(--panel-2);color:var(--muted);border-bottom:1px solid var(--border)">
          <th style="padding:10px 14px">Zaman</th>
          <th style="padding:10px 14px">Tür</th>
          <th style="padding:10px 14px">Kategori</th>
          <th style="padding:10px 14px">Eşya</th>
          <th style="padding:10px 14px">Miktar</th>
          <th style="padding:10px 14px">Birim Fiyat</th>
          <th style="padding:10px 14px">Toplam Tutar</th>
          <th style="padding:10px 14px">Net Kâr / Durum</th>
          <th style="padding:10px 14px">Açıklama</th>
        </tr>
      </thead>
      <tbody id="ledgerBody">
        <tr><td colspan="9" style="padding:24px;text-align:center;color:var(--muted-2)">Henüz kayıtlı işlem yok.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div style="margin-top:20px;display:flex;justify-content:flex-end">
  <button class="red" id="resetLedgerBtn" style="padding:8px 16px;font-size:13px">🗑️ Muhasebe & İstatistikleri Sıfırla</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
var s = io();
var currentStats = null;
var activeFilter = 'ALL';
var searchQuery = '';

function fmt(n){ n = Math.round(n || 0); return '$' + n.toLocaleString('tr-TR'); }

// Birim ekonomi verilerini guncelle
function updateEconomics(){
  fetch('/api/economics').then(function(r){ return r.json(); }).then(function(eco){
    if (!eco) return;
    document.getElementById('ecoHelmet').textContent = fmt(eco.helmetCost);
    document.getElementById('ecoBooks').textContent = fmt(eco.booksCost);
    document.getElementById('ecoXp').textContent = fmt(eco.xpCost);
    document.getElementById('ecoAnvil').textContent = fmt(eco.anvilDepreciation);
    document.getElementById('ecoTotalCost').textContent = fmt(eco.totalUnitCost);
    document.getElementById('ecoSellPrice').textContent = fmt(eco.avgSellPrice);
    document.getElementById('ecoProfit').textContent = '+' + fmt(eco.expectedProfit);
    document.getElementById('marginBadge').textContent = '%' + eco.marginPct + ' Kâr Marjı';
  }).catch(function(){});
}

function renderActiveListings(listings){
  var sec = document.getElementById('activeListingsSection');
  var tb = document.getElementById('activeListingsBody');
  var badge = document.getElementById('activeListingsCount');

  if (!listings || !listings.length) {
    sec.style.display = 'none';
    return;
  }

  sec.style.display = 'block';
  badge.textContent = listings.length + ' İlan';
  tb.innerHTML = '';

  listings.forEach(function(l){
    var tr = document.createElement('tr');
    tr.style = 'border-bottom:1px solid var(--border)';
    var profit = (l.total || 0) - (l.cost || 0);
    tr.innerHTML = '<td style="padding:10px 14px;color:var(--muted);white-space:nowrap">' + new Date(l.time).toLocaleTimeString('tr-TR') + '</td>' +
                   '<td style="padding:10px 14px;color:var(--amber);font-weight:700">' + (l.item || 'Eşya') + '</td>' +
                   '<td style="padding:10px 14px">' + (l.amount || 1) + '</td>' +
                   '<td style="padding:10px 14px;font-weight:700;color:var(--green)">' + fmt(l.unitPrice || l.total) + '</td>' +
                   '<td style="padding:10px 14px;color:var(--red)">' + fmt(l.cost || 0) + '</td>' +
                   '<td style="padding:10px 14px;font-weight:700;color:var(--accent)">+' + fmt(profit) + '</td>' +
                   '<td style="padding:10px 14px"><span class="badge listing">⏳ Satışta</span></td>';
    tb.appendChild(tr);
  });
}

function renderLedgerTable(ledger){
  var tb = document.getElementById('ledgerBody');
  if (!ledger) ledger = [];

  // Sayaçları güncelle
  var cAll = ledger.length;
  var cInc = ledger.filter(function(r){ return r.type === 'INCOME'; }).length;
  var cExp = ledger.filter(function(r){ return r.type === 'EXPENSE'; }).length;
  var cList = ledger.filter(function(r){ return r.type === 'LISTING'; }).length;
  var cRef = ledger.filter(function(r){ return r.type === 'REFUND'; }).length;

  document.getElementById('countAll').textContent = cAll;
  document.getElementById('countIncome').textContent = cInc;
  document.getElementById('countExpense').textContent = cExp;
  document.getElementById('countListing').textContent = cList;
  document.getElementById('countRefund').textContent = cRef;

  // Filtreleme
  var filtered = ledger.filter(function(row){
    if (activeFilter !== 'ALL' && row.type !== activeFilter) return false;
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      var itemStr = (row.item || '').toLowerCase();
      var catStr = (row.category || '').toLowerCase();
      var noteStr = (row.note || '').toLowerCase();
      if (!itemStr.includes(q) && !catStr.includes(q) && !noteStr.includes(q)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    tb.innerHTML = '<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--muted-2)">Filtreye uygun işlem bulunamadı.</td></tr>';
    return;
  }

  tb.innerHTML = '';
  filtered.forEach(function(row){
    var tr = document.createElement('tr');
    tr.style = 'border-bottom:1px solid var(--border)';
    var timeStr = new Date(row.time).toLocaleTimeString('tr-TR');

    var badgeClass = 'badge';
    var typeLabel = row.type;
    var totalColor = 'var(--text)';
    var profitText = '-';

    if (row.type === 'INCOME') {
      badgeClass = 'badge on';
      typeLabel = '🟢 GELİR';
      totalColor = 'var(--green)';
      profitText = '<span style="color:var(--green);font-weight:700">+' + fmt(row.profit !== undefined ? row.profit : row.total) + '</span>';
    } else if (row.type === 'EXPENSE') {
      badgeClass = 'badge off';
      typeLabel = '🔴 GİDER';
      totalColor = 'var(--red)';
      profitText = '<span style="color:var(--red)">-' + fmt(row.total) + '</span>';
    } else if (row.type === 'LISTING') {
      badgeClass = 'badge listing';
      typeLabel = '🟡 İLAN';
      totalColor = 'var(--amber)';
      profitText = '<span style="color:var(--amber)">~' + fmt(row.profit !== undefined ? row.profit : row.total) + ' (Bekleyen)</span>';
    } else if (row.type === 'REFUND') {
      badgeClass = 'badge refund';
      typeLabel = '🔄 İADE';
      totalColor = '#c084fc';
      profitText = '<span style="color:#c084fc">+' + fmt(row.total) + ' (Geri Alındı)</span>';
    }

    tr.innerHTML = '<td style="padding:10px 14px;color:var(--muted);white-space:nowrap">' + timeStr + '</td>' +
                   '<td style="padding:10px 14px"><span class="' + badgeClass + '">' + typeLabel + '</span></td>' +
                   '<td style="padding:10px 14px;font-weight:600">' + (row.category || '-') + '</td>' +
                   '<td style="padding:10px 14px;color:var(--amber);font-weight:600">' + (row.item || 'Eşya') + '</td>' +
                   '<td style="padding:10px 14px">' + (row.amount || 1) + '</td>' +
                   '<td style="padding:10px 14px">' + fmt(row.unitPrice) + '</td>' +
                   '<td style="padding:10px 14px;font-weight:700;color:' + totalColor + '">' + fmt(row.total) + '</td>' +
                   '<td style="padding:10px 14px">' + profitText + '</td>' +
                   '<td style="padding:10px 14px;color:var(--muted);font-size:11.5px">' + (row.note || '-') + '</td>';
    tb.appendChild(tr);
  });
}

function updateView(st){
  if (!st) return;
  currentStats = st;

  var earned = st.totalEarned || 0;
  var spent = st.totalSpent || 0;
  var net = earned - spent;
  var listing = st.activeListingValue || 0;

  document.getElementById('totalEarned').textContent = fmt(earned);
  document.getElementById('totalSpent').textContent = fmt(spent);
  document.getElementById('activeListingValue').textContent = fmt(listing);

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
      card.style = 'background:var(--panel-2);padding:14px;border:1px solid var(--border)';
      
      var lines = '';
      if (c.earned) lines += '<div style="font-size:13px;color:var(--green);font-weight:700">Gelir: +' + fmt(c.earned) + '</div>';
      if (c.spent) lines += '<div style="font-size:13px;color:var(--red);font-weight:700">Gider: -' + fmt(c.spent) + '</div>';
      if (c.listingValue) lines += '<div style="font-size:13px;color:var(--amber);font-weight:700">İlanda: ' + fmt(c.listingValue) + '</div>';

      card.innerHTML = '<div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">' + k + '</div>' +
                       '<div style="margin:6px 0">' + lines + '</div>' +
                       '<div style="font-size:11px;color:var(--muted-2)">' + (c.count || 0) + ' adet işlem</div>';
      catGrid.appendChild(card);
    });
  }

  // Aktif ilanlar tablosu
  renderActiveListings(st.activeListings || []);

  // Defter tablosu
  renderLedgerTable(st.ledger || []);
}

// Filtre sekmeleri tıklama dinleyicileri
document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.onclick = function(){
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    activeFilter = btn.getAttribute('data-filter') || 'ALL';
    if (currentStats) renderLedgerTable(currentStats.ledger || []);
  };
});

// Arama kutusu dinleyicisi
document.getElementById('ledgerSearch').oninput = function(e){
  searchQuery = e.target.value || '';
  if (currentStats) renderLedgerTable(currentStats.ledger || []);
};

// Sıfırlama butonu
document.getElementById('resetLedgerBtn').onclick = function(){
  if (!confirm('Tüm finans geçmişi, defter kayıtları ve istatistikler sıfırlanacak. Emin misin?')) return;
  fetch('/api/stats/reset', { method:'POST' }).then(function(r){ return r.json(); }).then(function(j){
    if (j.ok) updateView(j.stats);
  });
};

s.on('stats', updateView);
fetch('/api/stats').then(function(r){ return r.json(); }).then(updateView);
updateEconomics();
</script>`);
}

// ---------------- CASINO SAYFASI ----------------
function casinoPage() {
  return shell('🎰 Donut Casino', `
<style>
/* Casino Özel Tema */
:root {
  --cas-gold: #fbbf24;
  --cas-gold-glow: rgba(251, 191, 36, 0.35);
  --cas-purple: #8b5cf6;
  --cas-purple-dark: #1e1b4b;
  --cas-emerald: #10b981;
  --cas-rose: #f43f5e;
  --cas-card: #13141f;
  --cas-card-border: #26283b;
}

.casino-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: radial-gradient(circle at top left, #2e1065, #0f1016);
  border: 1px solid #4c1d95;
  border-radius: 16px;
  padding: 22px 24px;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.casino-title h1 {
  font-size: 26px;
  margin: 0;
  color: #fff;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
}
.casino-title p {
  color: #a78bfa;
  margin: 4px 0 0;
  font-size: 13px;
}

/* Kullanıcı & Bakiye Barı */
.cas-user-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 16, 26, 0.85);
  border: 1px solid var(--cas-card-border);
  padding: 8px 14px;
  border-radius: 12px;
}
.cas-balance-val {
  font-size: 19px;
  font-weight: 800;
  color: #34d399;
  text-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
}
.cas-btn {
  padding: 9px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cas-btn-deposit {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.cas-btn-deposit:hover { transform: translateY(-1px); filter: brightness(1.1); }
.cas-btn-withdraw {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
.cas-btn-withdraw:hover { transform: translateY(-1px); filter: brightness(1.1); }

/* Oyun Sekmeleri */
.game-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.g-tab-btn {
  flex: 1;
  padding: 14px;
  background: var(--cas-card);
  border: 1px solid var(--cas-card-border);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.g-tab-btn.active {
  background: linear-gradient(135deg, #2e1065, #1e1b4b);
  border-color: #8b5cf6;
  color: #fff;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}

/* Oyun Sahnesi Düzeni */
.game-arena {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
@media (max-width: 900px) {
  .game-arena { grid-template-columns: 1fr; }
}

.bet-panel {
  background: var(--cas-card);
  border: 1px solid var(--cas-card-border);
  border-radius: 16px;
  padding: 20px;
}
.bet-label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}
.bet-input-wrap {
  position: relative;
  margin-bottom: 12px;
}
.bet-input-wrap input {
  width: 100%;
  box-sizing: border-box;
  background: #090a10;
  border: 1px solid #33364f;
  color: #fff;
  padding: 12px 14px 12px 28px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
}
.bet-input-wrap input:focus { outline: none; border-color: #8b5cf6; }
.bet-input-wrap span {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-weight: bold;
}
.chip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 18px;
}
.chip-btn {
  background: #181926;
  border: 1px solid #2e3047;
  color: #cbd5e1;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip-btn:hover { background: #2e1065; border-color: #8b5cf6; color: #fff; }

.play-action-btn {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 6px 20px rgba(109, 40, 217, 0.4);
  transition: all 0.2s;
}
.play-action-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
.play-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Coinflip Ekranı */
.cf-screen {
  background: radial-gradient(circle at center, #1b1c2b, #0c0d14);
  border: 1px solid var(--cas-card-border);
  border-radius: 16px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 380px;
  position: relative;
  overflow: hidden;
}
.coin-container {
  width: 140px;
  height: 140px;
  position: relative;
  perspective: 1000px;
  margin-bottom: 24px;
}
.coin {
  width: 100%;
  height: 100%;
  position: absolute;
  transform-style: preserve-3d;
  transition: transform 1s ease-out;
  border-radius: 50%;
}
.coin-face {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52px;
  box-shadow: 0 0 25px rgba(251, 191, 36, 0.4), inset 0 0 15px rgba(0,0,0,0.4);
  border: 4px solid #f59e0b;
}
.coin-heads {
  background: radial-gradient(circle, #fde047, #d97706);
  color: #78350f;
}
.coin-tails {
  background: radial-gradient(circle, #fcd34d, #b45309);
  color: #78350f;
  transform: rotateY(180deg);
}

.coin.flipping-heads {
  animation: flipToHeads 1.6s cubic-bezier(0.15, 0.85, 0.35, 1.2) forwards;
}
.coin.flipping-tails {
  animation: flipToTails 1.6s cubic-bezier(0.15, 0.85, 0.35, 1.2) forwards;
}

@keyframes flipToHeads {
  0% { transform: rotateY(0deg) scale(1); }
  50% { transform: rotateY(1080deg) scale(1.35); }
  100% { transform: rotateY(2160deg) scale(1); }
}
@keyframes flipToTails {
  0% { transform: rotateY(0deg) scale(1); }
  50% { transform: rotateY(1080deg) scale(1.35); }
  100% { transform: rotateY(2340deg) scale(1); }
}

.choice-selector {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-bottom: 18px;
}
.choice-btn {
  flex: 1;
  padding: 12px;
  background: #181926;
  border: 2px solid #2e3047;
  border-radius: 10px;
  color: #cbd5e1;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.choice-btn.selected {
  border-color: var(--cas-gold);
  background: rgba(251, 191, 36, 0.1);
  color: #fff;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.25);
}

/* Mines (Mayın Tarlası) Ekranı */
.mines-screen {
  background: radial-gradient(circle at center, #1b1c2b, #0c0d14);
  border: 1px solid var(--cas-card-border);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 380px;
}
.mines-grid {
  display: grid;
  grid-template-columns: repeat(5, 62px);
  grid-template-rows: repeat(5, 62px);
  gap: 8px;
}
.m-tile {
  background: #25283d;
  border: 2px solid #363952;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.3);
}
.m-tile:hover:not(.revealed):not(:disabled) {
  background: #343854;
  border-color: #8b5cf6;
  transform: translateY(-2px);
}
.m-tile.revealed-diamond {
  background: radial-gradient(circle, #065f46, #064e3b);
  border-color: #10b981;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
  animation: tilePop 0.25s ease;
}
.m-tile.revealed-bomb {
  background: radial-gradient(circle, #881337, #4c0519);
  border-color: #f43f5e;
  box-shadow: 0 0 15px rgba(244, 63, 94, 0.4);
  animation: tilePop 0.25s ease;
}
.m-tile:disabled { cursor: default; }

@keyframes tilePop {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.mines-info-bar {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 340px;
  margin-bottom: 16px;
  background: #12131e;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #23253a;
}
.mines-stat-val {
  font-size: 15px;
  font-weight: 800;
  color: var(--cas-gold);
}

/* Canlı Kazançlar & Akış Ticker */
.recent-bets-card {
  background: var(--cas-card);
  border: 1px solid var(--cas-card-border);
  border-radius: 16px;
  padding: 18px 22px;
}
.recent-bets-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 15px;
  color: #fff;
  margin-bottom: 14px;
}
.bets-stream {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.bet-stream-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #090a12;
  border: 1px solid #1f2133;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  animation: fadeIn 0.3s ease;
}
.bet-stream-item.win { border-left: 4px solid var(--cas-emerald); }
.bet-stream-item.loss { border-left: 4px solid #475569; }

/* Modal Pencereleri */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(5px);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.modal-overlay.open { display: flex; }
.modal-box {
  background: #141522;
  border: 1px solid #363955;
  border-radius: 18px;
  width: 90%;
  max-width: 440px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  position: relative;
}
.modal-close {
  position: absolute;
  right: 18px;
  top: 18px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
}
.code-copy-box {
  background: #090a10;
  border: 1px dashed #4c1d95;
  padding: 12px 14px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  color: #a78bfa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 18px;
  cursor: pointer;
}
.code-copy-box:hover { border-color: #8b5cf6; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

<div class="casino-header">
  <div class="casino-title">
    <h1>🎰 DonutSMP Casino</h1>
    <p>Oyun içinde bota /pay at, bakiyen anında yüklensin, Coinflip & Mayın Tarlasında katla!</p>
  </div>

  <div id="authSection" class="cas-user-box">
    <div id="loggedOutView" style="display:flex;gap:8px">
      <input type="text" id="loginUsername" placeholder="Minecraft Nickin" style="background:#090a10;border:1px solid #33364f;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;width:140px">
      <button class="cas-btn cas-btn-deposit" onclick="login()">Giriş Yap</button>
    </div>
    <div id="loggedInView" style="display:none;align-items:center;gap:12px">
      <img id="userAvatar" src="" style="width:32px;height:32px;border-radius:6px;border:1px solid #4c1d95" alt="Avatar">
      <div>
        <div id="userNameDisp" style="font-weight:700;font-size:13px;color:#cbd5e1">Player</div>
        <div id="userBalanceDisp" class="cas-balance-val">$0</div>
      </div>
      <button class="cas-btn cas-btn-deposit" onclick="openDepositModal()">📥 Yatır</button>
      <button class="cas-btn" style="background:#7c3aed;color:#fff" onclick="claimFaucet()">🎁 Demo Para (+$500K)</button>
      <button class="cas-btn cas-btn-withdraw" onclick="openWithdrawModal()">📤 Çek</button>
      <button onclick="logout()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:16px" title="Çıkış Yap">🚪</button>
    </div>
  </div>
</div>

${navHtml('/casino')}

<!-- Oyun Sekmeleri -->
<div class="game-tabs">
  <div class="g-tab-btn active" id="tabBtnCf" onclick="switchGame('coinflip')">🪙 Coinflip (Yazı-Tura)</div>
  <div class="g-tab-btn" id="tabBtnMines" onclick="switchGame('mines')">💣 Mayın Tarlası (Mines)</div>
</div>

<!-- ================= 1. COINFLIP OYUN ALANI ================= -->
<div id="gameArenaCf" class="game-arena">
  <!-- Bahis Paneli -->
  <div class="bet-panel">
    <div class="bet-label">
      <span>Bahis Miktarı</span>
      <span style="color:#a78bfa">Oran: 1.95x</span>
    </div>
    <div class="bet-input-wrap">
      <span>$</span>
      <input type="number" id="cfBetInput" value="10000" min="1000" step="1000">
    </div>
    <div class="chip-grid">
      <button class="chip-btn" onclick="setCfBet(10000)">10K</button>
      <button class="chip-btn" onclick="setCfBet(50000)">50K</button>
      <button class="chip-btn" onclick="setCfBet(250000)">250K</button>
      <button class="chip-btn" onclick="setCfBet(1000000)">1M</button>
      <button class="chip-btn" onclick="multCfBet(0.5)">1/2</button>
      <button class="chip-btn" onclick="multCfBet(2)">2X</button>
      <button class="chip-btn" onclick="setCfMax()">MAX</button>
      <button class="chip-btn" onclick="setCfBet(1000)">MIN</button>
    </div>

    <div class="bet-label">Tarafını Seç</div>
    <div class="choice-selector">
      <div class="choice-btn selected" id="choiceHeads" onclick="selectCfChoice('heads')">
        <span style="font-size:24px">👑</span>
        <span>YAZI (Heads)</span>
      </div>
      <div class="choice-btn" id="choiceTails" onclick="selectCfChoice('tails')">
        <span style="font-size:24px">🦅</span>
        <span>TURA (Tails)</span>
      </div>
    </div>

    <button id="cfPlayBtn" class="play-action-btn" onclick="playCoinflip()">🪙 ÇEVİR ($1.95x)</button>
  </div>

  <!-- Sahne / Animasyon -->
  <div class="cf-screen">
    <div class="coin-container">
      <div id="coinObj" class="coin">
        <div class="coin-face coin-heads">👑</div>
        <div class="coin-face coin-tails">🦅</div>
      </div>
    </div>
    <div id="cfResultText" style="font-size:18px;font-weight:800;color:#94a3b8;min-height:28px">Bahsini yap ve parayı fırlat!</div>
  </div>
</div>

<!-- ================= 2. MINES (MAYIN TARLASI) OYUN ALANI ================= -->
<div id="gameArenaMines" class="game-arena" style="display:none">
  <!-- Bahis Paneli -->
  <div class="bet-panel">
    <div class="bet-label">
      <span>Bahis Miktarı</span>
      <span id="minesMultiplierLabel" style="color:#fbbf24">Çarpan: 1.00x</span>
    </div>
    <div class="bet-input-wrap">
      <span>$</span>
      <input type="number" id="minesBetInput" value="10000" min="1000" step="1000">
    </div>
    <div class="chip-grid">
      <button class="chip-btn" onclick="setMinesBet(10000)">10K</button>
      <button class="chip-btn" onclick="setMinesBet(50000)">50K</button>
      <button class="chip-btn" onclick="setMinesBet(250000)">250K</button>
      <button class="chip-btn" onclick="setMinesBet(1000000)">1M</button>
      <button class="chip-btn" onclick="multMinesBet(0.5)">1/2</button>
      <button class="chip-btn" onclick="multMinesBet(2)">2X</button>
      <button class="chip-btn" onclick="setMinesMax()">MAX</button>
      <button class="chip-btn" onclick="setMinesBet(1000)">MIN</button>
    </div>

    <div class="bet-label">Mayın Sayısı (1 - 24)</div>
    <div style="display:flex;gap:8px;margin-bottom:18px">
      <select id="minesCountSelect" style="width:100%;background:#090a10;border:1px solid #33364f;color:#fff;padding:12px;border-radius:8px;font-size:15px;font-weight:700">
        <option value="1">1 Mayın (Güvenli - Düşük Risk)</option>
        <option value="3" selected>3 Mayın (Dengeli)</option>
        <option value="5">5 Mayın (Yüksek Çarpan)</option>
        <option value="10">10 Mayın (Çılgın Risk)</option>
        <option value="24">24 Mayın (1 Elmas - 23.75x)</option>
      </select>
    </div>

    <button id="minesActionBtn" class="play-action-btn" onclick="handleMinesAction()">💣 OYUNU BAŞLAT</button>
  </div>

  <!-- 5x5 Izgara Sahnesi -->
  <div class="mines-screen">
    <div class="mines-info-bar">
      <div>
        <span style="font-size:11px;color:#94a3b8">ŞU ANKİ KAZANÇ:</span><br>
        <span id="minesCurrentCashout" class="mines-stat-val">$0</span>
      </div>
      <div style="text-align:right">
        <span style="font-size:11px;color:#94a3b8">SONRAKİ ELMAS:</span><br>
        <span id="minesNextMult" class="mines-stat-val" style="color:#34d399">--</span>
      </div>
    </div>

    <div id="minesGrid" class="mines-grid">
      <!-- 25 karo dinamik JS ile render edilecek -->
    </div>
  </div>
</div>

<!-- ================= CANLI AKIŞ & SON OYUNLAR ================= -->
<div class="recent-bets-card">
  <div class="recent-bets-head">
    <span>🔥 Canlı Bahisler & Kazananlar</span>
    <span style="font-size:11px;color:#64748b;font-weight:normal">(Anlık güncellenir)</span>
  </div>
  <div id="betsStreamList" class="bets-stream">
    <div style="color:#64748b;font-size:13px;text-align:center;padding:20px">Henüz oynanan oyun bulunmuyor...</div>
  </div>
</div>

<!-- ================= DEPOSIT MODAL ================= -->
<div id="depositModal" class="modal-overlay">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal('depositModal')">✕</button>
    <h3 style="margin-top:0;color:#34d399;display:flex;align-items:center;gap:8px">📥 Para Yatır (Deposit)</h3>
    <p style="font-size:13px;color:#94a3b8;line-height:1.5">
      1. Donut SMP sunucusuna bağlanın.<br>
      2. Oyun içinde aşağıdaki komutu yazarak botumuza dilediğiniz miktarı gönderin:
    </p>

    <div class="code-copy-box" onclick="copyDepositCmd()">
      <span id="depositCmdText">/pay BotIsmi 500000</span>
      <span style="font-size:11px;background:#4c1d95;padding:4px 8px;border-radius:4px;color:#fff">KOPYALA</span>
    </div>

    <div style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);padding:12px;border-radius:8px;font-size:12px;color:#6ee7b7;margin-bottom:14px">
      ⚡ Paranız gönderildiği an (2-3 saniye içinde) web sayfasındaki bakiyenize otomatik olarak yüklenecektir!
    </div>

    <div style="background:rgba(139,92,246,0.15);border:1px dashed #8b5cf6;padding:14px;border-radius:10px;text-align:center">
      <div style="font-weight:700;color:#c4b5fd;font-size:13px;margin-bottom:4px">🧪 Demo / Test Modu</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">Oyun içinde para yatırmadan sistemi test etmek için tek tıkla hesabına demo bakiye yükle:</div>
      <button class="cas-btn" style="background:#8b5cf6;color:#fff;width:100%;justify-content:center" onclick="claimFaucet()">🎁 +$500,000 Demo Bakiye Yükle</button>
    </div>
  </div>
</div>

<!-- ================= WITHDRAW MODAL ================= -->
<div id="withdrawModal" class="modal-overlay">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal('withdrawModal')">✕</button>
    <h3 style="margin-top:0;color:#fbbf24;display:flex;align-items:center;gap:8px">📤 Para Çek (Withdraw)</h3>
    <p style="font-size:13px;color:#94a3b8">
      Çekmek istediğiniz miktarı girin. Botumuz oyunda <strong id="withdrawNickDisp">oyuncunuza</strong> anında <code style="color:#a78bfa">/pay</code> gönderecektir.
    </p>

    <div class="bet-input-wrap">
      <span>$</span>
      <input type="number" id="withdrawAmountInput" value="50000" min="1000" step="1000">
    </div>

    <div style="display:flex;gap:6px;margin-bottom:16px">
      <button class="chip-btn" onclick="setWithdrawAmount(50000)">50K</button>
      <button class="chip-btn" onclick="setWithdrawAmount(250000)">250K</button>
      <button class="chip-btn" onclick="setWithdrawAmount(1000000)">1M</button>
      <button class="chip-btn" onclick="setWithdrawMax()">MAX</button>
    </div>

    <button id="withdrawConfirmBtn" class="play-action-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706)" onclick="submitWithdraw()">ONAYLA & OYUNDA AL</button>
  </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
var socket = io();
var currentUsername = localStorage.getItem('donut_casino_user') || '';
var currentBalance = 0;
var selectedCfChoice = 'heads';
var activeMinesGame = null;
var botServerName = 'Bot';

// Basit Ses Efektleri (Web Audio API)
var audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var now = audioCtx.currentTime;

    if (type === 'win') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'lose') {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (_) {}
}

function fmt(n) {
  return (Math.round(n || 0)).toLocaleString('tr-TR');
}

// ---------------- GİRİŞ / PROFİL ----------------
function login() {
  var u = document.getElementById('loginUsername').value.trim();
  if (!u) return alert('Lütfen geçerli bir Minecraft kullanıcı adı girin.');
  currentUsername = u;
  localStorage.setItem('donut_casino_user', u);
  refreshUserProfile();
}

function logout() {
  currentUsername = '';
  localStorage.removeItem('donut_casino_user');
  document.getElementById('loggedOutView').style.display = 'flex';
  document.getElementById('loggedInView').style.display = 'none';
}

function refreshUserProfile() {
  if (!currentUsername) {
    document.getElementById('loggedOutView').style.display = 'flex';
    document.getElementById('loggedInView').style.display = 'none';
    return;
  }

  fetch('/api/casino/user/' + encodeURIComponent(currentUsername))
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data.ok && data.profile) {
        document.getElementById('loggedOutView').style.display = 'none';
        document.getElementById('loggedInView').style.display = 'flex';
        document.getElementById('userNameDisp').textContent = data.profile.username;
        document.getElementById('userAvatar').src = 'https://mc-heads.net/avatar/' + encodeURIComponent(data.profile.username) + '/32';
        updateBalance(data.profile.balance);

        if (data.profile.activeMines) {
          restoreMinesGame(data.profile.activeMines);
        }
      }
    });
}

function updateBalance(b) {
  currentBalance = b || 0;
  document.getElementById('userBalanceDisp').textContent = '$' + fmt(currentBalance);
}

// ---------------- MODALLAR ----------------
function openDepositModal() {
  document.getElementById('depositCmdText').textContent = '/pay ' + botServerName + ' 500000';
  document.getElementById('depositModal').classList.add('open');
}
function claimFaucet() {
  if (!currentUsername) return alert('Lütfen önce Minecraft adınızla giriş yapın.');
  fetch('/api/casino/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUsername, amount: 500000 })
  }).then(function(r){ return r.json(); }).then(function(res){
    if (res.ok) {
      playSound('win');
      updateBalance(res.newBalance);
      alert('🎉 +' + fmt(res.amount) + ' Demo bakiye hesabınıza başarıyla yüklendi!');
    } else {
      alert('Hata: ' + res.error);
    }
  }).catch(function(err){
    alert('Sunucu hatası: ' + err.message);
  });
}
function openWithdrawModal() {
  if (!currentUsername) return alert('Önce giriş yapmalısınız.');
  document.getElementById('withdrawNickDisp').textContent = currentUsername;
  document.getElementById('withdrawAmountInput').max = currentBalance;
  document.getElementById('withdrawModal').classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function copyDepositCmd() {
  var txt = document.getElementById('depositCmdText').textContent;
  navigator.clipboard.writeText(txt).then(function(){
    alert('Kopyalandı! Oyunda chat açıp yapıştırın (CTRL+V): ' + txt);
  });
}
function submitWithdraw() {
  var amt = Number(document.getElementById('withdrawAmountInput').value);
  if (!amt || amt < 1000) return alert('Minimum çekim $1,000 olmalıdır.');
  if (amt > currentBalance) return alert('Bakiyeniz yetersiz.');

  var btn = document.getElementById('withdrawConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'İşleniyor...';

  socket.emit('casino:withdraw', { username: currentUsername, amount: amt }, function(res){
    btn.disabled = false;
    btn.textContent = 'ONAYLA & OYUNDA AL';
    if (res.ok) {
      alert('Talebiniz alındı! Bot oyunda $' + fmt(amt) + ' gönderiyor.');
      closeModal('withdrawModal');
      updateBalance(res.result.newBalance);
    } else {
      alert('Hata: ' + res.error);
    }
  });
}

// ---------------- SEKME GEÇİŞİ ----------------
function switchGame(g) {
  playSound('click');
  document.getElementById('tabBtnCf').classList.toggle('active', g === 'coinflip');
  document.getElementById('tabBtnMines').classList.toggle('active', g === 'mines');
  document.getElementById('gameArenaCf').style.display = g === 'coinflip' ? 'grid' : 'none';
  document.getElementById('gameArenaMines').style.display = g === 'mines' ? 'grid' : 'none';
}

// ---------------- COINFLIP MANTIĞI ----------------
function selectCfChoice(c) {
  playSound('click');
  selectedCfChoice = c;
  document.getElementById('choiceHeads').classList.toggle('selected', c === 'heads');
  document.getElementById('choiceTails').classList.toggle('selected', c === 'tails');
}
function setCfBet(v) { document.getElementById('cfBetInput').value = v; playSound('click'); }
function multCfBet(f) {
  var cur = Number(document.getElementById('cfBetInput').value) || 10000;
  document.getElementById('cfBetInput').value = Math.max(1000, Math.round(cur * f));
  playSound('click');
}
function setCfMax() { document.getElementById('cfBetInput').value = Math.max(1000, currentBalance); playSound('click'); }

function playCoinflip() {
  if (!currentUsername) return alert('Lütfen önce Minecraft adınızla giriş yapın.');
  var bet = Number(document.getElementById('cfBetInput').value);
  if (!bet || bet < 1000) return alert('Minimum bahis $1,000.');
  if (bet > currentBalance) return alert('Yetersiz bakiye! Lütfen para yatırın.');

  var btn = document.getElementById('cfPlayBtn');
  btn.disabled = true;
  document.getElementById('cfResultText').textContent = 'Para dönüyor... 🪙';
  document.getElementById('cfResultText').style.color = '#fbbf24';

  var coin = document.getElementById('coinObj');
  coin.className = 'coin';

  socket.emit('casino:coinflip', { username: currentUsername, bet: bet, choice: selectedCfChoice }, function(res){
    if (!res.ok) {
      btn.disabled = false;
      document.getElementById('cfResultText').textContent = res.error;
      document.getElementById('cfResultText').style.color = '#f43f5e';
      return;
    }

    var r = res.result;
    var animClass = r.resultSide === 'heads' ? 'flipping-heads' : 'flipping-tails';
    void coin.offsetWidth; // re-flow
    coin.classList.add(animClass);

    setTimeout(function(){
      btn.disabled = false;
      updateBalance(r.newBalance);

      if (r.won) {
        playSound('win');
        document.getElementById('cfResultText').innerHTML = '🎉 TEBRİKLER! +' + fmt(r.profit) + ' KAZANDIN! (1.95x)';
        document.getElementById('cfResultText').style.color = '#34d399';
      } else {
        playSound('lose');
        document.getElementById('cfResultText').innerHTML = '❌ Kaybettin (-$' + fmt(r.bet) + '). Şansını tekrar dene!';
        document.getElementById('cfResultText').style.color = '#f43f5e';
      }
    }, 1650);
  });
}

// ---------------- MINES (MAYIN TARLASI) MANTIĞI ----------------
function initMinesGrid() {
  var grid = document.getElementById('minesGrid');
  grid.innerHTML = '';
  for (var i = 0; i < 25; i++) {
    var btn = document.createElement('button');
    btn.className = 'm-tile';
    btn.id = 'mTile_' + i;
    btn.setAttribute('data-idx', i);
    btn.onclick = function(){ clickMinesTile(this.getAttribute('data-idx')); };
    grid.appendChild(btn);
  }
}
initMinesGrid();

function setMinesBet(v) { document.getElementById('minesBetInput').value = v; playSound('click'); }
function multMinesBet(f) {
  var cur = Number(document.getElementById('minesBetInput').value) || 10000;
  document.getElementById('minesBetInput').value = Math.max(1000, Math.round(cur * f));
  playSound('click');
}
function setMinesMax() { document.getElementById('minesBetInput').value = Math.max(1000, currentBalance); playSound('click'); }

function handleMinesAction() {
  if (activeMinesGame && activeMinesGame.status === 'in_progress') {
    // Bozdur (Cashout)
    cashoutMines();
  } else {
    // Yeni Oyun Başlat
    startMines();
  }
}

function startMines() {
  if (!currentUsername) return alert('Lütfen önce Minecraft adınızla giriş yapın.');
  var bet = Number(document.getElementById('minesBetInput').value);
  var minesCount = Number(document.getElementById('minesCountSelect').value);
  if (!bet || bet < 1000) return alert('Minimum bahis $1,000.');
  if (bet > currentBalance) return alert('Yetersiz bakiye.');

  var actionBtn = document.getElementById('minesActionBtn');
  actionBtn.disabled = true;

  socket.emit('casino:minesStart', { username: currentUsername, bet: bet, mines: minesCount }, function(res){
    actionBtn.disabled = false;
    if (!res.ok) return alert('Hata: ' + res.error);

    playSound('click');
    activeMinesGame = res.result;
    initMinesGrid();
    updateBalance(res.result.newBalance);
    renderMinesActiveState();
  });
}

function renderMinesActiveState() {
  var g = activeMinesGame;
  if (!g) return;

  var actionBtn = document.getElementById('minesActionBtn');
  document.getElementById('minesCountSelect').disabled = (g.status === 'in_progress');
  document.getElementById('minesBetInput').disabled = (g.status === 'in_progress');

  if (g.status === 'in_progress') {
    actionBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    actionBtn.textContent = '💰 BOZDUR ($' + fmt(g.currentPayout || g.bet) + ')';
    document.getElementById('minesMultiplierLabel').textContent = 'Çarpan: ' + (g.multiplier || 1).toFixed(2) + 'x';
    document.getElementById('minesCurrentCashout').textContent = '$' + fmt(g.currentPayout || g.bet);
    document.getElementById('minesNextMult').textContent = (g.nextMultiplier ? g.nextMultiplier.toFixed(2) + 'x' : '--');
  } else {
    actionBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
    actionBtn.textContent = '💣 OYUNU BAŞLAT';
    document.getElementById('minesMultiplierLabel').textContent = 'Çarpan: 1.00x';
    document.getElementById('minesCurrentCashout').textContent = '$0';
    document.getElementById('minesNextMult').textContent = '--';
  }
}

function clickMinesTile(idx) {
  if (!activeMinesGame || activeMinesGame.status !== 'in_progress') return;
  var tile = document.getElementById('mTile_' + idx);
  if (tile.classList.contains('revealed-diamond') || tile.classList.contains('revealed-bomb')) return;

  playSound('click');
  socket.emit('casino:minesReveal', { username: currentUsername, gameId: activeMinesGame.gameId, tileIndex: Number(idx) }, function(res){
    if (!res.ok) return alert(res.error);

    var r = res.result;
    if (r.status === 'busted') {
      playSound('lose');
      tile.classList.add('revealed-bomb');
      tile.textContent = '💣';

      // Kalan tüm mayınları aç
      if (Array.isArray(r.mineLocations)) {
        r.mineLocations.forEach(function(mIdx){
          var t = document.getElementById('mTile_' + mIdx);
          if (t) { t.classList.add('revealed-bomb'); t.textContent = '💣'; }
        });
      }
      activeMinesGame = null;
      renderMinesActiveState();
      alert('💥 BOMBA! Mayına bastınız ve bahsi kaybettiniz.');
    } else if (r.status === 'cashed_out' && r.autoWin) {
      playSound('win');
      tile.classList.add('revealed-diamond');
      tile.textContent = '💎';
      updateBalance(r.newBalance);
      activeMinesGame = null;
      renderMinesActiveState();
      alert('🎉 EFSANE! Tüm elmasları buldunuz ve $' + fmt(r.payout) + ' kazandınız!');
    } else {
      // Elmas bulundu
      playSound('click');
      tile.classList.add('revealed-diamond');
      tile.textContent = '💎';
      activeMinesGame.multiplier = r.multiplier;
      activeMinesGame.nextMultiplier = r.nextMultiplier;
      activeMinesGame.currentPayout = r.currentPayout;
      renderMinesActiveState();
    }
  });
}

function cashoutMines() {
  if (!activeMinesGame || activeMinesGame.status !== 'in_progress') return;
  socket.emit('casino:minesCashout', { username: currentUsername, gameId: activeMinesGame.gameId }, function(res){
    if (!res.ok) return alert('Bozdurma hatası: ' + res.error);

    var r = res.result;
    playSound('win');
    updateBalance(r.newBalance);

    // Kalan mayınları soluk renkle göster
    if (Array.isArray(r.mineLocations)) {
      r.mineLocations.forEach(function(mIdx){
        var t = document.getElementById('mTile_' + mIdx);
        if (t && !t.classList.contains('revealed-diamond')) {
          t.textContent = '💣';
          t.style.opacity = '0.4';
        }
      });
    }

    activeMinesGame = null;
    renderMinesActiveState();
    alert('💰 BOZDURULDU! $' + fmt(r.payout) + ' kazancınız hesabınıza yüklendi! (' + r.multiplier.toFixed(2) + 'x)');
  });
}

function restoreMinesGame(g) {
  activeMinesGame = g;
  initMinesGrid();
  if (Array.isArray(g.revealedTiles)) {
    g.revealedTiles.forEach(function(idx){
      var t = document.getElementById('mTile_' + idx);
      if (t) { t.classList.add('revealed-diamond'); t.textContent = '💎'; }
    });
  }
  renderMinesActiveState();
}

// ---------------- CANLI AKIŞ & SOCKET DİNLEYİCİLERİ ----------------
function appendStreamItem(html, type) {
  var list = document.getElementById('betsStreamList');
  if (list.children.length === 1 && list.children[0].textContent.includes('Henüz oynanan')) {
    list.innerHTML = '';
  }
  var el = document.createElement('div');
  el.className = 'bet-stream-item ' + (type || '');
  el.innerHTML = html;
  list.insertBefore(el, list.firstChild);
  if (list.children.length > 30) list.removeChild(list.lastChild);
}

socket.on('casino:newGame', function(g){
  var icon = g.game === 'coinflip' ? '🪙 Coinflip' : '💣 Mines';
  var statusBadge = g.won
    ? '<span style="color:#34d399;font-weight:bold">+$' + fmt(g.profit) + ' (' + (g.multiplier ? g.multiplier.toFixed(2) : '1.95') + 'x)</span>'
    : '<span style="color:#64748b">-$' + fmt(g.bet) + '</span>';

  var html = '<div><strong>' + g.username + '</strong> <span style="color:#64748b;font-size:11px">· ' + icon + '</span></div>' +
             '<div>' + statusBadge + '</div>';
  appendStreamItem(html, g.won ? 'win' : 'loss');
});

socket.on('casino:activity', function(a){
  if (a.type === 'deposit') {
    appendStreamItem('<div>📥 <strong style="color:#34d399">' + a.username + '</strong> para yatırdı</div><div style="color:#34d399;font-weight:bold">+$' + fmt(a.amount) + '</div>', 'win');
  } else if (a.type === 'withdraw') {
    appendStreamItem('<div>📤 <strong style="color:#fbbf24">' + a.username + '</strong> para çekti</div><div style="color:#fbbf24;font-weight:bold">-$' + fmt(a.amount) + '</div>', 'loss');
  }
});

// Kişisel Bakiye Güncellemeleri
socket.on('connect', function(){
  if (currentUsername) {
    socket.on('casino:user:' + currentUsername.toLowerCase(), function(u){
      updateBalance(u.balance);
    });
  }
});

// Başlangıç Yüklemesi
fetch('/api/casino/info').then(function(r){ return r.json(); }).then(function(inf){
  if (inf.botName) botServerName = inf.botName;
});
fetch('/api/casino/games').then(function(r){ return r.json(); }).then(function(data){
  if (data.ok && Array.isArray(data.recent)) {
    data.recent.reverse().forEach(function(g){
      var icon = g.game === 'coinflip' ? '🪙 Coinflip' : '💣 Mines';
      var statusBadge = g.won
        ? '<span style="color:#34d399;font-weight:bold">+$' + fmt(g.profit) + ' (' + (g.multiplier ? g.multiplier.toFixed(2) : '1.95') + 'x)</span>'
        : '<span style="color:#64748b">-$' + fmt(g.bet) + '</span>';
      var html = '<div><strong>' + g.username + '</strong> <span style="color:#64748b;font-size:11px">· ' + icon + '</span></div><div>' + statusBadge + '</div>';
      appendStreamItem(html, g.won ? 'win' : 'loss');
    });
  }
});

if (currentUsername) {
  refreshUserProfile();
}
</script>
`);
}

module.exports = { homePage, casinoPage, ledgerPage, settingsPage, probePage, statsPage };
