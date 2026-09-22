# Donut Bot Geliştirici Kuralları

- **Otomatik Git Senkronizasyonu & Versiyonlama (Tag):** Bu projede (`donut-bot`) yapılan her değişiklikten, yeni özellik eklemesinden veya hata düzeltmesinden sonra:
  1. `package.json` içerisindeki versiyon numarası güncellenmelidir (SemVer mantığıyla: yama için patch, yeni özellik için minor artırılır).
  2. Değişiklikler git'e eklenip açıklayıcı bir commit mesajı ile commit edilmelidir (`git add . && git commit -m "..."`).
  3. Yeni versiyona ait git tag'i oluşturulmalıdır (`git tag vX.Y.Z`).
  4. Değişiklikler ve tag'ler GitHub'a otomatik push edilmelidir (`git push origin main --tags`).
- **Veri Dosyaları Koruması:** `settings.json` ve `stats.json` dosyalarının yapısı korunmalı, var olan kullanıcı ayarları ezilmemelidir.
- **Paylaşılan Durum:** Değişkenler ve durumlar doğrudan `state.js` üzerinden yönetilmelidir.
