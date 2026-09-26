# Gurmeranya — Kurulum

Site şu an **yerel mod**da çalışır (veriler tarayıcıda). Aşağıdaki 3 adımla gerçek siteye döner.

## Dosyalar
- `Gurmeranya.dc.html` — site
- `support.js`, `styles.css` — çalışması için gerekli
- `db.js` — veri katmanı (Firebase / yerel) + Google Places araması
- `config.js` — anahtarlar buraya
- `index.html` — ana adrese gelen herkesi siteye yönlendirir

---

## 1) Firebase (veritabanı + giriş)

1. https://console.firebase.google.com → **Proje ekle** → ad: `gurmeranya`.
2. **Build > Firestore Database** → *Create database* → Production mode → bölge `eur3` (Avrupa).
3. **Build > Authentication** → *Get started* → **Email/Password**'ü aç.
   - *Users* sekmesi → *Add user* → e-posta: kendi e-postan, şifre: `yaman1905`.
   - Oluşan kullanıcının **User UID**'sini kopyala.
4. **Proje ayarları (⚙) > Genel > Uygulamalarınız > Web (</>)** → kaydet → çıkan `firebaseConfig` nesnesini kopyala.
5. `config.js`'i doldur:
   ```js
   export const CONFIG = {
     firebase: { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." },
     adminEmail: "senin@mailin.com",
     mapsKey: "AIza..."
   };
   ```
6. **Firestore > Rules** sekmesine bunu yapıştır (`SENIN_UID` yerine 3. adımdaki UID) → *Publish*:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == "SENIN_UID";
       }
     }
   }
   ```
   Böylece herkes görür, sadece sen eklersin. Kilit şifresi Firebase'de doğrulanır, kodda görünmez.
7. **Authentication > Settings > Authorized domains** → `KULLANICIADIN.github.io` ekle.

## 2) Google Places API (mekân arama + fotoğraf)

1. https://console.cloud.google.com → Firebase projesini seç.
2. **APIs & Services > Library** → **Places API (New)**'i etkinleştir. (Faturalandırma hesabı ister; aylık ücretsiz kota kişisel kullanım için yeterli.)
3. **Credentials** → mevcut anahtarını düzenle:
   - *Application restrictions* → **Websites** → `https://KULLANICIADIN.github.io/*`
   - *API restrictions* → sadece **Places API (New)**
4. Sitede kilitten gir → **Ayarlar** → anahtarı yapıştır → **Dene** → **Kaydet**. (`config.js`'e yazmana gerek yok.)

Yeni mekân → Google Maps linkini ya da adını yapıştır → **Getir**: ad, şehir, ilçe, adres, fotoğraf ve Google puanı kendiliğinden dolar.
Telefondan paylaşılan kısa linkler (`maps.app.goo.gl`) tarayıcıdan çözülemez; linki bir kez açıp adres çubuğundaki uzun linki yapıştır ya da adını yaz.

## 3a) Vercel ile yayına alma (önerilen — repo gizli kalabilir)

1. https://vercel.com → **Continue with GitHub**.
2. **Add New → Project** → `gurmeranya` reposunu **Import**.
3. Framework Preset: **Other** · Build Command: boş · Output Directory: boş → **Deploy**.
4. Adres: `https://gurmeranya.vercel.app` (Settings → Domains'ten kendi alan adını da bağlayabilirsin).
5. GitHub'a her yüklemede Vercel kendiliğinden yeniler.
6. Bu adresi Firebase **Authorized domains**'e ve Google anahtarının **Website restrictions**'ına ekle.

## 3b) Alternatif: GitHub Pages (repo public olmalı)

1. https://github.com/new → repo adı `gurmeranya` → Public → *Create*.
2. *uploading an existing file* → bu projedeki tüm dosyaları (`_ds` klasörü hariç) sürükle → *Commit*.
3. Repo **Settings > Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → *Save*.
4. 1–2 dk sonra site: `https://KULLANICIADIN.github.io/gurmeranya/`

Güncellemek için: dosyayı GitHub'da düzenle veya yenisini yükle → Pages otomatik yeniler.

### Not
- `config.js`'teki Firebase ayarları gizli değildir, açık olması normaldir; güvenliği yukarıdaki kurallar ve anahtar kısıtlamaları sağlar.
- Yerel moddaki örnek mekânlar Firebase'e taşınmaz; bağlandıktan sonra kendi mekânlarını eklersin.
