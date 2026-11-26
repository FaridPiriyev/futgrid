export const SITE = "https://futgrid.az";
export const SITE_NAME = "FutGrid";
export const DEFAULT_DESCRIPTION =
  "Futbol X0X, Futbol Wordle, Karyera yolu, Heyəti xatırla və daha çox futbol bilik oyunu. Pulsuz oyna, dostunla yarış, reytinqdə yüksəl.";

export const GAMES = [
  {
    "path": "/oyunlar/futbol-x0x",
    "title": "Futbol X0X",
    "genre": "Bilik · Strategiya",
    "description": "Sətir və sütundakı klub, ölkə, məşqçi və kubokların kəsişməsində oynamış futbolçunu tap. Üç xananı bir xətdə tutan qalib olur."
  },
  {
    "path": "/oyunlar/ortaq-oyuncu",
    "title": "Ortaq Oyunçu",
    "genre": "Kart dueli",
    "description": "Kartları gizli seç, açılanda ortaq futbolçunu birinci tap."
  },
  {
    "path": "/oyunlar/auksion",
    "title": "Açıq Artırma",
    "genre": "Hərrac · Komanda qur",
    "description": "20 ₼ büdcə ilə hərraca gir, 5 oyunçuluq komanda yığ. Ən güclü heyəti quran qalib olur."
  },
  {
    "path": "/oyunlar/yuksek-asagi",
    "title": "Yüksək yoxsa Aşağı?",
    "genre": "Seriya",
    "description": "İki futbolçudan hansının bazar dəyəri daha yüksəkdir? Düzgün tap, seriyanı uzat."
  },
  {
    "path": "/oyunlar/futbol-wordle",
    "title": "Futbol Wordle",
    "genre": "Söz oyunu",
    "description": "Futbolçunun soyadını 6 cəhddə tap. Hərflər yaşıl, sarı və ya boz yanır, hər səhvdən sonra ipucu açılır."
  },
  {
    "path": "/oyunlar/karyera-yolu",
    "title": "Karyera yolu",
    "genre": "Bilik oyunu",
    "description": "Klubların ardıcıllığına bax, məsələn Barcelona → PSG → Inter Miami, və bu yolu keçən futbolçunu tap."
  },
  {
    "path": "/oyunlar/heyeti-xatirla",
    "title": "Heyəti xatırla",
    "genre": "Yaddaş oyunu",
    "description": "Təsadüfi məşhur oyun və komanda gəlir. Başlanğıc heyəti xatırla, boş yerləri adlarla doldur."
  },
  {
    "path": "/oyunlar/5-klub",
    "title": "5 klub",
    "genre": "Sürət oyunu",
    "description": "5 klub gəlir. Ortaq klubları seç və onların hamısında oynamış futbolçunu yaz: 2 klub 2 xal, 3 klub 3 xal."
  },
  {
    "path": "/oyunlar/klublari-sirala",
    "title": "Klubları sırala",
    "genre": "Bilik oyunu",
    "description": "Futbolçu gəlir, qutular onun klublarının sayı qədərdir. Qutuya toxun və klubları karyera sırası ilə düz."
  },
  {
    "path": "/oyunlar/piramida",
    "title": "Piramida",
    "genre": "Sürət oyunu",
    "description": "5-4-3-2-1: hər səviyyədə iki şərtə uyğun futbolçuları vaxt bitməmiş yaz və zirvəyə qalx."
  },
  {
    "path": "/oyunlar/tarixin-en-yaxsisi",
    "title": "Tarixin ən yaxşısı",
    "genre": "Səsvermə oyunu",
    "description": "128 ikonik futbolçu, hər turda ikisindən biri. 64, 32, 16… sonda tək bir əfsanə qalır."
  },
  {
    "path": "/oyunlar/iki-herf",
    "title": "İki hərf",
    "genre": "Duel oyunu",
    "description": "İki oyunçu, iki hərf. Adında hər iki hərf olan futbolçunu növbə ilə tap, vaxtı bitən uduzur."
  },
  {
    "path": "/oyunlar/20-sual",
    "title": "20 sual",
    "genre": "Sual-cavab",
    "description": "Gizli futbolçunu bəli/xeyr sualları ilə tap: aktivdir? hücumçudur? Premyer Liqada oynayıb? Ən az sualla tapan qalib olur."
  },
  {
    "path": "/oyunlar/kimdir-bu",
    "title": "Kimdir bu?",
    "genre": "Şəkil oyunu",
    "description": "Futbolçunun şəkli 16 və ya 24 xanaya bölünüb, hər dəfə bir xana açılır. Şəkildəki futbolçunu ilk tanıyan qalib olur."
  },
  {
    "path": "/oyunlar/ultimate-11",
    "title": "Ultimate 11",
    "genre": "Komanda qur · Baraban",
    "description": "Klub və dövr barabanlarını fırlat, hər raundda o illərin futbolçusundan birini seç və 11 raundda ən güclü heyəti qur."
  }
];

export const PAGES = [
  {
    path: "/",
    title: "FutGrid — futbol bilik oyunları",
    description: DEFAULT_DESCRIPTION,
    h1: "FutGrid — futbol bilik oyunları",
    intro:
      "FutGrid-də futbol biliyini sınayan 15 oyun var: tək oyna, dostunla yarış və reytinqdə yüksəl. Qeydiyyat lazım deyil.",
    priority: "1.0",
  },
  {
    path: "/oyunlar",
    title: "Bütün oyunlar | FutGrid",
    description:
      "FutGrid-in bütün futbol oyunları bir yerdə: tək oyna və ya dostunla eyni ekranda yarış.",
    h1: "Bütün oyunlar",
    intro: "FutGrid-in bütün futbol bilik oyunları.",
    priority: "0.9",
  },
  {
    path: "/mexfilik-siyaseti",
    title: "Məxfilik siyasəti | FutGrid",
    description: "FutGrid hansı məlumatları toplayır və onlardan necə istifadə edir.",
    h1: "Məxfilik siyasəti",
    intro: "FutGrid hansı məlumatları toplayır və onlardan necə istifadə edir.",
    priority: "0.3",
  },
  {
    path: "/istifade-sertleri",
    title: "İstifadə şərtləri | FutGrid",
    description: "FutGrid saytından istifadə qaydaları.",
    h1: "İstifadə şərtləri",
    intro: "FutGrid saytından istifadə qaydaları.",
    priority: "0.3",
  },
  {
    path: "/hesab",
    title: "Hesab | FutGrid",
    description: "FutGrid hesabınız, statistikanız və reytinq nəticələriniz.",
    h1: "Hesab",
    intro: "",
    index: false,
  },
  {
    path: "/admin",
    title: "Admin panel | FutGrid",
    description: "FutGrid idarəetmə paneli.",
    h1: "Admin panel",
    intro: "",
    index: false,
  },
];

export const ROUTES = [
  ...PAGES.slice(0, 2),
  ...GAMES.map((game) => ({
    path: game.path,
    title: `${game.title} | FutGrid`,
    description: game.description,
    h1: game.title,
    intro: `${game.description} ${game.genre}. FutGrid-də pulsuz oyna.`,
    priority: "0.8",
    game,
  })),
  ...PAGES.slice(2),
];

export const NOINDEX_PATHS = new Set(
  ROUTES.filter((route) => route.index === false).map((route) => route.path),
);
