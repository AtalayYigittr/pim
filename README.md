# Pazarlama Veritabanı

Ürün pazarlama bilgilerini yönetmek için React + Google Drive tabanlı web uygulaması.

## Özellikler
- 🏢 **Multi-firma** — Her firma ID'si kendi izole veritabanını kullanır
- ☁️ **Google Drive** — Veriler Drive'da JSON olarak saklanır, ücretsiz
- 🔐 **Kullanıcı yönetimi** — Admin + Bayi rolleri, şifreli giriş
- 📦 **Ürün yönetimi** — Görsel, CE belgesi, EAN, özellikler
- 📊 **Doluluk raporu** — Eksik alanları tespit eder
- 📄 **PDF katalog** — Seçilen ürünleri PDF olarak indir
- 🤖 **Gemini AI** — Ürün öneri özelliği (API key gerekir)

## Kurulum

### 1. Google Cloud Console
1. [console.cloud.google.com](https://console.cloud.google.com) → Projeniz
2. **APIs & Services → Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   ```
   https://KULLANICI.github.io
   http://localhost:3000
   ```
5. Client ID'yi `App.tsx` içindeki `GOOGLE_CLIENT_ID` sabitine yazın

### 2. GitHub Pages
Repository → Settings → Pages → Source: **GitHub Actions**

### 3. Lokal geliştirme
```bash
npm install
npm run dev
```

## Firma ID Sistemi
- Her firma farklı bir ID girer (örn: `LORENTZ`, `ACME`, `SIRKET1`)
- Her ID için Drive'da ayrı bir `pazarlama_db_ID.json` dosyası oluşur
- Firmalar birbirinin verisini göremez
- Yeni firma ID'si ilk girişte otomatik kurulur

## Ortam Değişkenleri
```
GEMINI_API_KEY=   # İsteğe bağlı, AI öneriler için
```
