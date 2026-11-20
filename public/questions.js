(function (root) {
  var DIMENSIONS = [
    { key: "attention", name: "Diqqat va o‘zini boshqarish", from: 1, to: 4 },
    { key: "motivation", name: "O‘qishga motivatsiya va qiziqish", from: 5, to: 8 },
    { key: "emotion", name: "Hissiy holat va psixologik ehtiyojlar", from: 9, to: 12 },
    { key: "critical", name: "Mustaqillik va tanqidiy fikrlash", from: 13, to: 16 },
    { key: "balance", name: "Raqamli odatlar va ta’limdagi muvozanat", from: 17, to: 20 }
  ];

  var QUESTIONS = [
    { n: 1, q: "Mustaqil ta’lim bilan shug‘ullanayotganingizda telefoningizga xabar kelsa, odatda qanday yo‘l tutasiz?",
      o: ["Xabarni darhol ko‘raman, keyin o‘qishga qaytaman.", "Xabarni ko‘rishga moyil bo‘laman, lekin ba’zan keyinga qoldira olaman.", "O‘qishimni tugatmagunimcha xabarga e’tibor bermaslikka harakat qilaman."] },
    { n: 2, q: "Ma’ruza davomida mavzu murakkablashib, uni tushunish qiyinlashsa, qanday yo‘l tutasiz?",
      o: ["E’tiborimni boshqa narsalarga qaratib yuborishim mumkin.", "Bir muddat chalg‘isam ham, yana mavzuga qaytishga harakat qilaman.", "Mavzuni tushunish uchun qo‘shimcha manbalardan foydalanaman va diqqatimni saqlayman."] },
    { n: 3, q: "Imtihonga tayyorlanayotganingizda ijtimoiy tarmoqlarga kirish istagi paydo bo‘lsa, nima qilasiz?",
      o: ["Ko‘pincha ijtimoiy tarmoqqa kirib, rejalashtirilgan vaqtdan ko‘proq qolib ketaman.", "Ba’zan kiraman, lekin o‘zimni cheklashga harakat qilaman.", "Avval belgilangan tayyorgarlikni tugatib, keyin ijtimoiy tarmoqlardan foydalanaman."] },
    { n: 4, q: "Ma’ruza tinglash, xabar yozish va internetdan ma’lumot qidirishni bir vaqtda bajarish siz uchun qanday kechadi?",
      o: ["Bir vaqtning o‘zida bir nechta ishni bajarishga odatlanganman, lekin ayrim ma’lumotlarni o‘tkazib yuboraman.", "Bir nechta ishni bajarishga urinaman, ammo diqqatim bo‘linishini sezaman.", "Muhim o‘quv vazifalarini navbat bilan bajarishni afzal ko‘raman."] },
    { n: 5, q: "Ta’lim jarayonida video, animatsiya va interaktiv materiallardan foydalanish sizga qanday ta’sir qiladi?",
      o: ["Bunday materiallar bo‘lmasa, mavzuga qiziqishim tez pasayadi.", "Ular mavzuni tushunishimga yordam beradi, ammo boshqa usullar ham kerak.", "Ularni mavzuni yaxshiroq tushunish uchun qo‘shimcha vosita sifatida ishlataman."] },
    { n: 6, q: "Mustaqil topshiriq uchun internetdan kerakli ma’lumotni topa olmasangiz, qanday yo‘l tutasiz?",
      o: ["Topshiriqni bajarishga bo‘lgan qiziqishim pasayadi va boshqa ishga chalg‘iyman.", "Boshqa manbalarni izlayman, ammo bu jarayonda qiynalishim mumkin.", "Turli manbalarni solishtirib, kerakli ma’lumotni mustaqil izlashda davom etaman."] },
    { n: 7, q: "Topshiriq bajarishda sun’iy intellekt vositasidan foydalanishingiz kerak bo‘lsa, qanday yo‘l tutasiz?",
      o: ["Tayyor javobni olib, topshiriqqa deyarli o‘zgartirishsiz kiritaman.", "AI bergan javobni ko‘rib chiqaman va ayrim qismlarini o‘zgartiraman.", "AI’dan fikr va tushuntirish olish uchun foydalanib, yakuniy ishni o‘zim shakllantiraman."] },
    { n: 8, q: "Sizga unchalik qiziq bo‘lmagan fan bo‘yicha topshiriq berilsa, raqamli vositalardan qanday foydalanasiz?",
      o: ["Topshiriqni tezroq tugatish uchun tayyor materiallarni izlayman.", "Mavzuni tushunish uchun video va internet manbalaridan foydalanaman.", "Mavzuni o‘rganishga yordam beradigan manbalarni tanlab, topshiriqni mustaqil bajaraman."] },
    { n: 9, q: "Dars davomida telefoningizni tekshirish imkoniyati bo‘lmasa, o‘zingizni qanday his qilasiz?",
      o: ["Telefonimni tekshirish istagi kuchayadi va diqqatim boshqa narsaga chalg‘iydi.", "Dastlab noqulaylik sezaman, lekin vaqt o‘tishi bilan darsga moslashaman.", "Telefonim yonimda bo‘lmasa ham, darsga bemalol e’tibor qarata olaman."] },
    { n: 10, q: "Ijtimoiy tarmoqlarda boshqa talabalar muvaffaqiyatlarini ko‘rganingizda qanday munosabat bildirasiz?",
      o: ["O‘zimni ular bilan ko‘p solishtiraman va kayfiyatim o‘zgarishi mumkin.", "Ba’zan o‘zimni solishtiraman, lekin bu holatga tanqidiy qarashga harakat qilaman.", "Boshqalarning yutuqlarini axborot sifatida qabul qilaman va o‘z maqsadlarimga e’tibor qarataman."] },
    { n: 11, q: "Imtihon oldidan internetda juda ko‘p ma’lumot va materiallar topilsa, qanday yo‘l tutasiz?",
      o: ["Ko‘p ma’lumotni bir vaqtda ko‘rib, qaysi birini o‘rganishni tanlashda qiynalaman.", "Bir nechta manbani ko‘rib chiqaman, keyin keraklilarini ajrataman.", "Oldindan belgilangan reja asosida faqat zarur ma’lumotlarni tanlayman."] },
    { n: 12, q: "Onlayn darsda savolga javob berishga ishonchingiz komil bo‘lmasa, qanday yo‘l tutasiz?",
      o: ["Javobni internetdan yoki boshqa manbadan tezda izlashga harakat qilaman.", "Avval o‘z fikrimni shakllantiraman, zarur bo‘lsa qo‘shimcha ma’lumot izlayman.", "Bilganlarim asosida javob beraman, keyin kerak bo‘lsa ma’lumotimni tekshiraman."] },
    { n: 13, q: "Ilmiy topshiriq uchun internetdan tayyor maqola topsangiz, qanday yo‘l tutasiz?",
      o: ["Tayyor maqoladan foydalanib, topshiriqni tezroq yakunlayman.", "Maqolani o‘rganib, o‘z ishimga mos qismlarini tanlayman.", "Maqolani tahlil qilaman, boshqa manbalar bilan solishtiraman va o‘z xulosamni shakllantiraman."] },
    { n: 14, q: "Sun’iy intellekt sizga bergan javob shubhali yoki noto‘g‘ri ko‘rinsa, nima qilasiz?",
      o: ["Javobni qulay deb hisoblasam, undan foydalanaveraman.", "Javobni boshqa manbalar orqali tekshirishga harakat qilaman.", "Bir nechta ishonchli manbani solishtirib, javobning to‘g‘riligini mustaqil baholayman."] },
    { n: 15, q: "Internetda topshiriqning tayyor yechimini topsangiz, qanday yo‘l tutasiz?",
      o: ["Tayyor yechimdan foydalanib, topshiriqni yakunlayman.", "Yechimni ko‘rib chiqaman va uning qanday olinganini tushunishga harakat qilaman.", "Avval mustaqil yechishga urinaman, keyin tayyor yechim bilan solishtiraman."] },
    { n: 16, q: "Sizningcha, raqamli texnologiyalardan haddan tashqari foydalanish mustaqil fikrlashga qanday ta’sir qilishi mumkin?",
      o: ["Tayyor javoblarga odatlanish mustaqil fikrlashni kamaytirishi mumkin.", "Ta’siri texnologiyadan qanday foydalanishga bog‘liq.", "Maqsadli foydalanilsa, texnologiya mustaqil fikrlashni rivojlantirishga ham yordam beradi."] },
    { n: 17, q: "Bir kun davomida telefon yoki kompyuterdan foydalanish vaqtingiz odatdagidan ko‘payib ketsa, qanday yo‘l tutasiz?",
      o: ["Foydalanish vaqtimni nazorat qilishga uncha e’tibor bermayman.", "Vaqt ko‘payganini sezaman va keyingi kunlarda kamaytirishga harakat qilaman.", "Foydalanish vaqtimni kuzatib, o‘quv va dam olish vaqtini muvozanatlashtiraman."] },
    { n: 18, q: "O‘qish uchun telefon kerak, ammo undagi boshqa ilovalar sizni chalg‘itayotgan bo‘lsa, nima qilasiz?",
      o: ["O‘quv topshirig‘i bilan birga boshqa ilovalardan ham foydalanib ketaman.", "Chalg‘ituvchi ilovalarga kirishni kamaytirishga harakat qilaman.", "O‘quv vaqtida kerakli ilovalardan foydalanib, qolganlarini cheklayman."] },
    { n: 19, q: "Bir hafta davomida internetdan faqat ta’limiy maqsadlarda foydalanish kerak bo‘lsa, bu siz uchun qanday kechadi?",
      o: ["Bunga rioya qilishim qiyin bo‘ladi.", "Ko‘p hollarda rioya qila olaman, lekin ayrim vaziyatlarda chekinishim mumkin.", "Foydalanish maqsadimni aniq belgilab, bu tartibga amal qila olaman."] },
    { n: 20, q: "Sizningcha, muvaffaqiyatli talaba raqamli texnologiyalardan qanday foydalanishi kerak?",
      o: ["Kerakli ma’lumotni tez topish va topshiriqlarni tez bajarish uchun.", "O‘qish jarayonini yengillashtirish bilan birga, foydalanish vaqtini ham nazorat qilib.", "Mustaqil fikrlash, bilim olish va ijodiy ishlashni rivojlantiradigan maqsadli vosita sifatida."] }
  ];

  var POINTS = [0, 2.5, 5]; // A, B, C
  var LETTERS = ["A", "B", "C"];

  var CATEGORIES = [
    { key: "low", min: 0, max: 39, name: "Nazorat darajasi past",
      text: "Raqamli vositalar o‘quv jarayonida tez-tez chalg‘itishi mumkin. Foydalanish odatlarini boshqarishga e’tibor zarur.",
      tip: "Mustaqil ta’lim vaqtida telefonni bezovta qilmaslik rejimiga qo‘ying, bildirishnomalarni o‘chiring va 25 daqiqalik diqqat bilan o‘qish + 5 daqiqa tanaffus tartibini sinab ko‘ring." },
    { key: "mid", min: 40, max: 59, name: "Nazoratni kuchaytirish kerak",
      text: "Texnologiyadan foydalanish ustidan nazorat mavjud, ammo ayrim vaziyatlarda chalg‘ish kuzatilishi mumkin.",
      tip: "Eng ko‘p chalg‘itadigan ilovalarni aniqlab, o‘qish vaqtida ularga kirishni cheklang va kunlik foydalanish vaqtingizni kuzatib boring." },
    { key: "good", min: 60, max: 79, name: "Asosan nazoratli foydalanish",
      text: "Raqamli vositalardan ko‘pincha maqsadli foydalaniladi, lekin ayrim odatlarni takomillashtirish mumkin.",
      tip: "Siz raqamli texnologiyalardan asosan maqsadli foydalanasiz. Biroq mustaqil ta’lim jarayonida chalg‘ituvchi omillarni kamaytirish orqali foydalanish samaradorligini yanada oshirishingiz mumkin." },
    { key: "high", min: 80, max: 100, name: "Yuqori darajadagi nazorat",
      text: "Raqamli texnologiyalardan ongli, maqsadli va muvozanatli foydalanish kuzatiladi.",
      tip: "Joriy odatlaringizni saqlang va tajribangizni guruhdoshlaringiz bilan baham ko‘ring: texnologiyadan maqsadli foydalanish bo‘yicha o‘zaro yordam samarali bo‘ladi." }
  ];

  function categoryOf(score) {
    for (var i = CATEGORIES.length - 1; i >= 0; i--) if (score >= CATEGORIES[i].min) return CATEGORIES[i];
    return CATEGORIES[0];
  }

  // answers: { "1": 0|1|2, ... }  (0=A, 1=B, 2=C)
  function score(answers) {
    var total = 0, dims = {};
    DIMENSIONS.forEach(function (d) { dims[d.key] = 0; });
    QUESTIONS.forEach(function (q) {
      var a = answers[q.n];
      var p = POINTS[a] || 0;
      total += p;
      DIMENSIONS.forEach(function (d) { if (q.n >= d.from && q.n <= d.to) dims[d.key] += p; });
    });
    return { total: total, dims: dims };
  }

  var api = { DIMENSIONS: DIMENSIONS, QUESTIONS: QUESTIONS, POINTS: POINTS, LETTERS: LETTERS, CATEGORIES: CATEGORIES, categoryOf: categoryOf, score: score };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.TEST = api;
})(typeof window !== "undefined" ? window : globalThis);
