# Raqamli qaramlik va ta’lim — QR-kodli interaktiv test

Tashqi kutubxonalarsiz (faqat Node.js 22.5+). Ma’lumotlar SQLite bazasida saqlanadi.

## Mahalliy ishga tushirish (sinf ichida, bitta Wi-Fi)
    TEACHER_PASSWORD=MeningParolim node server.js
Ustoz: http://localhost:3000/ustoz — QR-kod avtomatik kompyuterning Wi-Fi IP manzili bilan chiqadi
(talabalar telefoni ham xuddi shu Wi-Fi’da bo‘lishi kerak). Kerak bo‘lsa «Havola manzili» maydonida o‘zgartiring.

## Internetga joylash (Render.com, tavsiya)
1. Papkani GitHub’ga yuklang.
2. render.com → New → Blueprint → shu repo (render.yaml avtomatik o‘qiladi).
3. Environment: `TEACHER_PASSWORD` = o‘zingizning parolingiz.
4. Tayyor bo‘lgach `https://<nom>.onrender.com/ustoz` — QR-kod shu manzil bilan chiqadi.
Boshqa joy (Railway, Fly.io, VPS): `docker build -t test . && docker run -p 3000:3000 -v data:/data -e TEACHER_PASSWORD=... test`.
Doimiy diskni `/data` ga ulang, aks holda qayta ishga tushganda natijalar yo‘qoladi.

## Muhit o‘zgaruvchilari
TEACHER_PASSWORD (majburiy, standart: ustoz123), PORT, DB_PATH, PUBLIC_URL (ixtiyoriy), SESSION_SECRET (ixtiyoriy).
