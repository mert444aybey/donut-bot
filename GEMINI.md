# Donut Bot Geliştirici Kuralları

- **Otomatik Git Senkronizasyonu:** Bu projede (`donut-bot`) yapılan her değişiklikten, yeni özellik eklemesinden veya hata düzeltmesinden sonra değişiklikler otomatik olarak git'e eklenmeli, açıklayıcı bir commit mesajı ile commit edilmeli ve GitHub'a push edilmelidir (`git add . && git commit -m "..." && git push origin main`).
- **Veri Dosyaları Koruması:** `settings.json` ve `stats.json` dosyalarının yapısı korunmalı, var olan kullanıcı ayarları ezilmemelidir.
- **Paylaşılan Durum:** Değişkenler ve durumlar doğrudan `state.js` üzerinden yönetilmelidir.
