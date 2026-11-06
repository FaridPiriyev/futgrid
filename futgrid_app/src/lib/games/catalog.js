import { tr } from "../../i18n";
export const GAME_CATALOG = [
  {
    key: "x0x",
    get title() {
    return tr("Futbol X0X");
  },
    get genre() {
    return tr("Bilik · Strategiya");
  },
    get description() {
    return tr("Sətir və sütundakı klub, ölkə, məşqçi və kubokların kəsişməsində oynamış futbolçunu tap. Üç xananı bir xətdə tutan qalib olur.");
  },
    image: "/images/game1.jpg",
    href: "/oyunlar/futbol-x0x",
    get tags() {
    return ["2 oyunçu", "Tək oyunçu", "3 səviyyə"].map((s) => tr(s));
  },
    modes: ["solo", "duo"],
    status: "live",
  },
  {
    key: "ortaq",
    get title() {
    return tr("Ortaq Oyunçu");
  },
    get genre() {
    return tr("Kart dueli");
  },
    get description() {
    return tr("Kartları gizli seç, açılanda ortaq futbolçunu birinci tap.");
  },
    image: "/images/game2.jpg",
    href: "/oyunlar/ortaq-oyuncu",
    get tags() {
    return ["Kart dueli", "2 oyunçu", "Tək oyunçu"].map((s) => tr(s));
  },
    modes: ["solo", "duo"],
    status: "live",
  },
  {
    key: "auksion",
    get title() {
    return tr("Açıq Artırma");
  },
    get genre() {
    return tr("Hərrac · Komanda qur");
  },
    get description() {
    return tr("20 ₼ büdcə ilə hərraca gir, 5 oyunçuluq komanda yığ. Ən güclü heyəti quran qalib olur.");
  },
    image: "/images/game3.png",
    href: "/oyunlar/auksion",
    get tags() {
    return ["Bota qarşı", "2 oyunçu", "20 ₼ büdcə"].map((s) => tr(s));
  },
    modes: ["solo", "duo"],
    status: "live",
  },
  {
    key: "yuksek",
    get title() {
    return tr("Yüksək yoxsa Aşağı?");
  },
    get genre() {
    return tr("Seriya");
  },
    get description() {
    return tr("İki futbolçudan hansının bazar dəyəri daha yüksəkdir? Düzgün tap, seriyanı uzat.");
  },
    image: "/images/game4.jpg",
    href: "/oyunlar/yuksek-asagi",
    get tags() {
    return ["Tək oyunçu", "Seriya", "Bazar dəyəri"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
  },
  {
    key: "wordle",
    get title() {
    return tr("Futbol Wordle");
  },
    get genre() {
    return tr("Söz oyunu");
  },
    get description() {
    return tr("Futbolçunun soyadını 6 cəhddə tap. Hərflər yaşıl, sarı və ya boz yanır, hər səhvdən sonra ipucu açılır.");
  },
    image: "/images/game5.png",
    href: "/oyunlar/futbol-wordle",
    get tags() {
    return ["Tək oyunçu", "Günün oyunçusu", "Sonsuz"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
  {
    key: "karyera",
    get title() {
    return tr("Karyera yolu");
  },
    get genre() {
    return tr("Bilik oyunu");
  },
    get description() {
    return tr("Klubların ardıcıllığına bax, məsələn Barcelona → PSG → Inter Miami, və bu yolu keçən futbolçunu tap.");
  },
    image: "/images/game6.png",
    href: "/oyunlar/karyera-yolu",
    get tags() {
    return ["Tək oyunçu", "10 raund", "İpuçları"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
  {
    key: "heyet",
    get title() {
    return tr("Heyəti xatırla");
  },
    get genre() {
    return tr("Yaddaş oyunu");
  },
    get description() {
    return tr("Təsadüfi məşhur oyun və komanda gəlir. Başlanğıc heyəti xatırla, boş yerləri adlarla doldur.");
  },
    image: "/images/game7.jpg",
    href: "/oyunlar/heyeti-xatirla",
    get tags() {
    return ["Tək oyunçu", "Məşhur oyunlar"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
  {
    key: "besklub",
    get title() {
    return tr("5 klub");
  },
    get genre() {
    return tr("Sürət oyunu");
  },
    get description() {
    return tr("5 klub gəlir. Ortaq klubları seç və onların hamısında oynamış futbolçunu yaz: 2 klub 2 xal, 3 klub 3 xal.");
  },
    image: "/images/game8.jpg",
    href: "/oyunlar/5-klub",
    get tags() {
    return ["Tək oyunçu", "Vaxta qarşı"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
  {
    key: "sirala",
    get title() {
    return tr("Klubları sırala");
  },
    get genre() {
    return tr("Bilik oyunu");
  },
    get description() {
    return tr("Futbolçu gəlir, qutular onun klublarının sayı qədərdir. Qutuya toxun və klubları karyera sırası ilə düz.");
  },
    image: "/images/game9.jpg",
    href: "/oyunlar/klublari-sirala",
    get tags() {
    return ["Tək oyunçu", "10 raund"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
  {
    key: "piramida",
    get title() {
    return tr("Piramida");
  },
    get genre() {
    return tr("Sürət oyunu");
  },
    get description() {
    return tr("5-4-3-2-1: hər səviyyədə iki şərtə uyğun futbolçuları vaxt bitməmiş yaz və zirvəyə qalx.");
  },
    image: "/images/game10.jpg",
    href: "/oyunlar/piramida",
    get tags() {
    return ["Tək oyunçu", "Vaxta qarşı", "5 səviyyə"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
  {
    key: "goat",
    get title() {
    return tr("Tarixin ən yaxşısı");
  },
    get genre() {
    return tr("Səsvermə oyunu");
  },
    get description() {
    return tr("128 ikonik futbolçu, hər turda ikisindən biri. 64, 32, 16… sonda tək bir əfsanə qalır.");
  },
    image: "/images/game11.jpg",
    href: "/oyunlar/tarixin-en-yaxsisi",
    get tags() {
    return ["Tək oyunçu", "128 əfsanə", "Turnir"].map((s) => tr(s));
  },
    modes: ["solo"],
    status: "live",
    isNew: true,
  },
];
