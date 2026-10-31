import { Link } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const CONTACT = "info@futgrid.az";

const CONTENT = {
  privacy: {
    az: {
      kicker: "Hüquqi məlumat",
      title: "Məxfilik siyasəti",
      updated: "Son yenilənmə: 1 noyabr 2026",
      intro:
        "Bu sənəd FutGrid saytından istifadə edərkən hansı məlumatların toplandığını, onlardan necə istifadə edildiyini və hansı hüquqlara malik olduğunu izah edir.",
      sections: [
        {
          h: "Topladığımız məlumatlar",
          p: [
            "Hesab yaratmadan oynayırsan, ona görə ad, e-poçt və ya şifrə kimi şəxsi məlumatları qeydiyyat üçün toplamırıq.",
            "Əlaqə formasını doldursan, yazdığın ad, e-poçt ünvanı və mesaj bizə göndərilir. Bu məlumatlardan yalnız sənə cavab vermək üçün istifadə edirik.",
          ],
        },
        {
          h: "Brauzerdə saxlanan məlumatlar",
          p: [
            "Oyun parametrləri, günün oyunlarının nəticələri, rekordlar, seçdiyin dil və mövzu (açıq və ya tünd rejim) brauzerinin yaddaşında (localStorage) saxlanılır.",
            "Bu məlumatlar sənin cihazında qalır, bizim serverə göndərilmir. Brauzerin məlumatlarını təmizləməklə onları istənilən vaxt silə bilərsən.",
          ],
        },
        {
          h: "Üçüncü tərəf xidmətləri",
          p: [
            "Əlaqə forması Formspree xidməti vasitəsilə göndərilir. Şriftlər Google Fonts-dan, bəzi bayraq şəkilləri flagcdn.com-dan yüklənir. Bu xidmətlər texniki səbəblərdən IP ünvanını və brauzer məlumatlarını görə bilər.",
            "Klub, oyunçu və məşqçi məlumatları açıq futbol mənbələrindən toplanır və sayta statik fayl kimi əlavə olunur.",
          ],
        },
        {
          h: "Kukilər",
          p: [
            "Reklam və ya izləmə kukiləri istifadə etmirik. Yalnız saytın işləməsi üçün lazım olan brauzer yaddaşından istifadə edirik.",
          ],
        },
        {
          h: "Uşaqlar",
          p: [
            "Sayt hər yaş üçün açıqdır, amma 16 yaşdan kiçik istifadəçilərdən bilərəkdən şəxsi məlumat toplamırıq. Belə bir məlumatın göndərildiyini düşünürsənsə, bizə yaz, silək.",
          ],
        },
        {
          h: "Hüquqların",
          p: [
            "Bizə göndərdiyin məlumatlara baxmaq, onları düzəltmək və ya silinməsini istəmək hüququn var. Bunun üçün aşağıdakı ünvana yazmaq kifayətdir.",
          ],
        },
        {
          h: "Dəyişikliklər",
          p: [
            "Bu siyasət vaxtaşırı yenilənə bilər. Yeni versiya bu səhifədə dərc olunur və yuxarıdakı tarix dəyişir.",
          ],
        },
      ],
      contact: "Suallar üçün",
    },
    en: {
      kicker: "Legal",
      title: "Privacy policy",
      updated: "Last updated: 1 November 2026",
      intro:
        "This document explains what information is collected when you use FutGrid, how it is used and what rights you have.",
      sections: [
        {
          h: "Information we collect",
          p: [
            "You play without creating an account, so we do not collect personal data such as your name, email or password for registration.",
            "If you fill in the contact form, the name, email address and message you enter are sent to us. We use them only to reply to you.",
          ],
        },
        {
          h: "Data stored in your browser",
          p: [
            "Game settings, daily game results, records, your chosen language and theme (light or dark mode) are stored in your browser's storage (localStorage).",
            "This data stays on your device and is not sent to our server. You can delete it at any time by clearing your browser data.",
          ],
        },
        {
          h: "Third-party services",
          p: [
            "The contact form is sent through Formspree. Fonts are loaded from Google Fonts and some flag images from flagcdn.com. For technical reasons these services may see your IP address and browser information.",
            "Club, player and coach data is collected from public football sources and added to the site as static files.",
          ],
        },
        {
          h: "Cookies",
          p: [
            "We do not use advertising or tracking cookies. We only use the browser storage needed for the site to work.",
          ],
        },
        {
          h: "Children",
          p: [
            "The site is open to all ages, but we do not knowingly collect personal data from users under 16. If you believe such data was sent to us, write to us and we will delete it.",
          ],
        },
        {
          h: "Your rights",
          p: [
            "You have the right to see, correct or request deletion of the data you sent us. Just write to the address below.",
          ],
        },
        {
          h: "Changes",
          p: [
            "This policy may be updated from time to time. The new version is published on this page and the date above changes.",
          ],
        },
      ],
      contact: "Questions",
    },
    ru: {
      kicker: "Правовая информация",
      title: "Политика конфиденциальности",
      updated: "Последнее обновление: 1 ноября 2026",
      intro:
        "Этот документ объясняет, какие данные собираются при использовании FutGrid, как они используются и какие у вас есть права.",
      sections: [
        {
          h: "Какие данные мы собираем",
          p: [
            "Вы играете без регистрации, поэтому мы не собираем для неё личные данные: имя, e-mail или пароль.",
            "Если вы заполняете форму обратной связи, нам отправляются указанные имя, e-mail и сообщение. Мы используем их только для ответа вам.",
          ],
        },
        {
          h: "Данные в вашем браузере",
          p: [
            "Настройки игр, результаты ежедневных игр, рекорды, выбранный язык и тема (светлая или тёмная) хранятся в памяти браузера (localStorage).",
            "Эти данные остаются на вашем устройстве и не отправляются на наш сервер. Вы можете удалить их в любой момент, очистив данные браузера.",
          ],
        },
        {
          h: "Сторонние сервисы",
          p: [
            "Форма обратной связи отправляется через сервис Formspree. Шрифты загружаются из Google Fonts, некоторые изображения флагов — с flagcdn.com. По техническим причинам эти сервисы могут видеть ваш IP-адрес и данные браузера.",
            "Данные о клубах, игроках и тренерах собираются из открытых футбольных источников и добавляются на сайт как статические файлы.",
          ],
        },
        {
          h: "Файлы cookie",
          p: [
            "Мы не используем рекламные и отслеживающие cookie. Используется только память браузера, необходимая для работы сайта.",
          ],
        },
        {
          h: "Дети",
          p: [
            "Сайт открыт для всех возрастов, но мы сознательно не собираем личные данные пользователей младше 16 лет. Если вы считаете, что такие данные были отправлены, напишите нам — мы их удалим.",
          ],
        },
        {
          h: "Ваши права",
          p: [
            "Вы вправе просмотреть, исправить или запросить удаление отправленных нам данных. Для этого достаточно написать на адрес ниже.",
          ],
        },
        {
          h: "Изменения",
          p: [
            "Политика может время от времени обновляться. Новая версия публикуется на этой странице, а дата выше меняется.",
          ],
        },
      ],
      contact: "Вопросы",
    },
  },
  terms: {
    az: {
      kicker: "Hüquqi məlumat",
      title: "İstifadə şərtləri",
      updated: "Son yenilənmə: 1 noyabr 2026",
      intro:
        "FutGrid saytından istifadə etməklə aşağıdakı şərtləri qəbul etmiş olursan. Şərtlərlə razı deyilsənsə, saytdan istifadə etməməyini xahiş edirik.",
      sections: [
        {
          h: "Xidmət",
          p: [
            "FutGrid futbol biliyini yoxlamaq üçün pulsuz onlayn oyunlar təqdim edir. Oyunlar əyləncə məqsədi daşıyır, heç bir mərc və ya pul mükafatı nəzərdə tutulmur. Açıq Artırma oyunundakı büdcə virtual puldur.",
          ],
        },
        {
          h: "Məlumatların düzgünlüyü",
          p: [
            "Oyunçu, klub, transfer və bazar dəyəri məlumatları açıq mənbələrdən toplanır və vaxtaşırı yenilənir. Onların tam və həmişə aktual olmasına zəmanət vermirik. Səhv görsən, bizə yaz.",
          ],
        },
        {
          h: "Düzgün istifadə",
          p: [
            "Saytın işini pozmaq, avtomatlaşdırılmış vasitələrlə kütləvi sorğu göndərmək, reytinq nəticələrini saxtalaşdırmaq və ya başqa istifadəçilərə zərər vermək qadağandır.",
          ],
        },
        {
          h: "Əqli mülkiyyət",
          p: [
            "FutGrid adı, loqosu, dizaynı və oyunların mexanikası FutGrid-ə məxsusdur. Klubların adları, gerbləri və digər nişanları onların sahiblərinə aiddir və saytda yalnız məlumat məqsədilə göstərilir. FutGrid heç bir klub, liqa və ya federasiya ilə rəsmi əlaqəli deyil.",
          ],
        },
        {
          h: "Məsuliyyətin məhdudlaşdırılması",
          p: [
            "Sayt “olduğu kimi” təqdim olunur. Fasiləsiz və xətasız işləməsinə zəmanət vermirik və saytdan istifadə nəticəsində yarana biləcək dolayı zərərlərə görə məsuliyyət daşımırıq.",
          ],
        },
        {
          h: "Dəyişikliklər",
          p: [
            "Bu şərtlər vaxtaşırı yenilənə bilər. Dəyişiklikdən sonra saytdan istifadəni davam etdirmək yeni şərtləri qəbul etmək deməkdir.",
          ],
        },
      ],
      contact: "Suallar üçün",
    },
    en: {
      kicker: "Legal",
      title: "Terms of use",
      updated: "Last updated: 1 November 2026",
      intro:
        "By using FutGrid you accept the terms below. If you do not agree with them, please do not use the site.",
      sections: [
        {
          h: "The service",
          p: [
            "FutGrid offers free online games to test your football knowledge. The games are for entertainment only; there is no betting and no cash prize. The budget in the Auction game is virtual money.",
          ],
        },
        {
          h: "Accuracy of data",
          p: [
            "Player, club, transfer and market value data is collected from public sources and updated from time to time. We do not guarantee that it is complete or always up to date. If you spot a mistake, let us know.",
          ],
        },
        {
          h: "Fair use",
          p: [
            "It is forbidden to disrupt the site, send mass automated requests, fake leaderboard results or harm other users.",
          ],
        },
        {
          h: "Intellectual property",
          p: [
            "The FutGrid name, logo, design and game mechanics belong to FutGrid. Club names, crests and other marks belong to their owners and are shown on the site for information only. FutGrid is not officially affiliated with any club, league or federation.",
          ],
        },
        {
          h: "Limitation of liability",
          p: [
            "The site is provided “as is”. We do not guarantee uninterrupted or error-free operation and are not liable for indirect damages arising from the use of the site.",
          ],
        },
        {
          h: "Changes",
          p: [
            "These terms may be updated from time to time. Continuing to use the site after a change means you accept the new terms.",
          ],
        },
      ],
      contact: "Questions",
    },
    ru: {
      kicker: "Правовая информация",
      title: "Условия использования",
      updated: "Последнее обновление: 1 ноября 2026",
      intro:
        "Используя FutGrid, вы принимаете условия ниже. Если вы с ними не согласны, пожалуйста, не используйте сайт.",
      sections: [
        {
          h: "Сервис",
          p: [
            "FutGrid предлагает бесплатные онлайн-игры для проверки футбольных знаний. Игры носят развлекательный характер: ставок и денежных призов нет. Бюджет в игре «Аукцион» — виртуальные деньги.",
          ],
        },
        {
          h: "Точность данных",
          p: [
            "Данные об игроках, клубах, трансферах и рыночной стоимости собираются из открытых источников и периодически обновляются. Мы не гарантируем их полноту и постоянную актуальность. Если заметите ошибку, напишите нам.",
          ],
        },
        {
          h: "Добросовестное использование",
          p: [
            "Запрещается нарушать работу сайта, отправлять массовые автоматические запросы, подделывать результаты рейтинга или вредить другим пользователям.",
          ],
        },
        {
          h: "Интеллектуальная собственность",
          p: [
            "Название, логотип, дизайн и игровая механика FutGrid принадлежат FutGrid. Названия, эмблемы и другие знаки клубов принадлежат их владельцам и показываются на сайте только в информационных целях. FutGrid официально не связан ни с одним клубом, лигой или федерацией.",
          ],
        },
        {
          h: "Ограничение ответственности",
          p: [
            "Сайт предоставляется «как есть». Мы не гарантируем бесперебойную и безошибочную работу и не несём ответственности за косвенный ущерб от использования сайта.",
          ],
        },
        {
          h: "Изменения",
          p: [
            "Условия могут время от времени обновляться. Продолжая пользоваться сайтом после изменений, вы принимаете новые условия.",
          ],
        },
      ],
      contact: "Вопросы",
    },
  },
};

const OTHER = {
  privacy: { to: "/istifade-sertleri", key: "terms" },
  terms: { to: "/mexfilik-siyaseti", key: "privacy" },
};

const BACK = { az: "Ana səhifə", en: "Home", ru: "Главная" };

export default function Legal({ page, lang }) {
  const doc = CONTENT[page][lang] ?? CONTENT[page].az;
  const other = OTHER[page];
  const otherDoc = CONTENT[other.key][lang] ?? CONTENT[other.key].az;
  const Icon = page === "privacy" ? ShieldCheck : FileText;

  return (
    <section className="relative w-full overflow-hidden bg-page pb-20 pt-10 md:pb-28 md:pt-16">
      <div
        aria-hidden="true"
        className="fg-pitch absolute inset-x-0 top-0 h-72 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 md:px-6">
        <Link
          to="/"
          className={`group inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-[0.15em] text-muted transition-colors duration-300 hover:text-ink`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          {BACK[lang] ?? BACK.az}
        </Link>

        <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className={`flex items-center gap-3 ${FONT} text-base font-bold uppercase tracking-widest text-accent`}
            >
              <span aria-hidden="true" className="h-0.5 w-10 bg-accent" />
              {doc.kicker}
            </p>
            <h1
              className={`mt-2 ${FONT} text-[clamp(1.35rem,6.4vw,2.25rem)] font-black uppercase leading-[0.95] text-ink [overflow-wrap:anywhere] sm:text-5xl md:text-6xl`}
            >
              {doc.title}
            </h1>
          </div>
          <span
            className={`rounded-full bg-yellow px-3.5 py-1.5 ${FONT} text-xs font-black uppercase tracking-[0.12em] text-on-yellow`}
          >
            {doc.updated}
          </span>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
          <nav className="hidden lg:block">
            <ol className="sticky top-28 space-y-1 border-l-2 border-edge">
              {doc.sections.map((s, i) => (
                <li key={s.h}>
                  <a
                    href={`#s${i + 1}`}
                    className={`-ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 ${FONT} text-sm font-bold uppercase tracking-wide text-muted transition-colors duration-200 hover:border-accent hover:text-ink`}
                  >
                    {String(i + 1).padStart(2, "0")} · {s.h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="rounded-2xl border border-edge bg-surface p-5 shadow-[0_30px_60px_-44px_var(--fg-shadow)] md:p-10">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-yellow">
                <Icon className="h-6 w-6" />
              </span>
              <p className={`${BODY} text-base leading-7 text-ink-soft md:text-lg md:leading-8`}>
                {doc.intro}
              </p>
            </div>

            <div className="mt-8 space-y-8">
              {doc.sections.map((s, i) => (
                <section key={s.h} id={`s${i + 1}`} className="scroll-mt-28">
                  <h2
                    className={`flex items-baseline gap-3 ${FONT} text-xl font-black uppercase text-ink md:text-2xl`}
                  >
                    <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {s.h}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {s.p.map((text) => (
                      <p
                        key={text}
                        className={`${BODY} text-[15px] leading-7 text-muted md:text-base`}
                      >
                        {text}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy px-5 py-4 text-white">
              <p className={`${FONT} text-sm font-bold uppercase tracking-[0.14em] text-yellow`}>
                {doc.contact}
              </p>
              <a
                href={`mailto:${CONTACT}`}
                className={`${BODY} font-bold transition-colors duration-200 hover:text-yellow`}
              >
                {CONTACT}
              </a>
            </div>
          </article>
        </div>

        <div className="mt-8 flex justify-end">
          <Link
            to={other.to}
            className={`inline-flex items-center gap-2 rounded-xl border-2 border-edge bg-surface px-5 py-3 ${FONT} text-sm font-extrabold uppercase tracking-wide text-ink transition-colors duration-200 hover:border-accent hover:text-accent`}
          >
            {otherDoc.title} →
          </Link>
        </div>
      </div>
    </section>
  );
}
