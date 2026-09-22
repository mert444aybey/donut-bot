# Donut SMP Orders Bot

Donut SMP sunucusunda `/orders` sistemi üzerinden otomatik sipariş verme ve toplama yapan gelişmiş Mineflayer botu ve Web kontrol paneli.

## Özellikler

- **Tam Döngü Otomasyonu:**
  - Belirlenen eşyaları otomatik sipariş verir (`/orders`).
  - Sipariş panosundaki en yüksek fiyatı tarayarak dinamik fiyatlandırma yapar.
  - Sipariş teslim edilince otomatik olarak toplar.
  - Hata veya bağlantı kesintilerinde güvenli şekilde kendini toparlar.

- **Çoklu Eşya (Portföy) Modu:**
  - Birden fazla eşyayı sırayla döngüye sokarak işlem yapar.
  - Web panelinden tek tıkla eşya ekleme, silme ve düzenleme.

- **Canlı Keşif & Envanter Yönetimi (Probe):**
  - Botun envanterini ve açık sandık/GUI menülerini tarayıcı üzerinden canlı izleme.
  - Slotlara tıklayarak doğrudan etkileşim (Normal, Shift-Click, Sağ Tık).
  - Fare imlecinde tutulan eşyayı gerçek zamanlı takip etme.
  - Tabela editörü ile arama ve metin girişi desteği.

- **Kullanıcı Dostu Web Paneli:**
  - Canlı `/bal` bakiye takibi (Türkçe ve uluslararası sayı formatı desteği).
  - Tek tıkla **Bot Çıkış (Exit)** ve **Bot Giriş (Join)** yönetimi.
  - Sadeleştirilmiş ayarlar menüsü ve isteğe bağlı gelişmiş teknik ayarlar akordeonu.

- **Anti-Ban & Anti-AFK:**
  - Tıklamalar ve pencereler arası insansı rastgele gecikmeler (jitter).
  - Boşta beklerken hafif kafa çevirme ve çömelme hareketleri.

## Kurulum

1. Depoyu klonlayın veya indirin:
   ```bash
   git clone <repo-url>
   cd donut-bot
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Botu başlatın:
   ```bash
   node index.js
   ```

4. Web paneline tarayıcınızdan erişin:
   - **Ana Panel:** [http://localhost:3007](http://localhost:3007)
   - **Ayarlar:** [http://localhost:3007/settings](http://localhost:3007/settings)
   - **Keşif (Probe):** [http://localhost:3007/probe](http://localhost:3007/probe)
   - **İstatistikler:** [http://localhost:3007/stats](http://localhost:3007/stats)
