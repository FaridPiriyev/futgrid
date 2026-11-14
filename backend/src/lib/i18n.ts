export type Locale = "az" | "en" | "ru";

export const LOCALES: Locale[] = ["az", "en", "ru"];

export function parseLocale(value: string | undefined): Locale {
  const first = (value ?? "").split(",")[0]?.split("-")[0]?.trim().toLowerCase();
  return LOCALES.includes(first as Locale) ? (first as Locale) : "az";
}

type MessageTable = Record<string, Record<Locale, string>>;

const messages: MessageTable = {
  VALIDATION_FAILED: {
    az: "Məlumatlar düzgün deyil.",
    en: "The submitted data is invalid.",
    ru: "Отправленные данные недействительны.",
  },
  UNAUTHENTICATED: {
    az: "Giriş tələb olunur.",
    en: "Authentication required.",
    ru: "Требуется авторизация.",
  },
  FORBIDDEN: {
    az: "Bu əməliyyat üçün icazəniz yoxdur.",
    en: "You are not allowed to perform this action.",
    ru: "У вас нет прав на это действие.",
  },
  NOT_FOUND: {
    az: "Tapılmadı.",
    en: "Not found.",
    ru: "Не найдено.",
  },
  CONFLICT: {
    az: "Bu əməliyyat artıq yerinə yetirilib.",
    en: "This operation has already been performed.",
    ru: "Эта операция уже выполнена.",
  },
  INVALID_RESULT: {
    az: "Nəticə qəbul edilmədi.",
    en: "The result was rejected.",
    ru: "Результат отклонён.",
  },
  RATE_LIMITED: {
    az: "Çox cəhd etdiniz. Sonra yenidən yoxlayın.",
    en: "Too many attempts. Try again later.",
    ru: "Слишком много попыток. Попробуйте позже.",
  },
  INTERNAL: {
    az: "Daxili xəta baş verdi.",
    en: "An internal error occurred.",
    ru: "Произошла внутренняя ошибка.",
  },
  EMAIL_TAKEN: {
    az: "Bu e-poçt artıq qeydiyyatdadır.",
    en: "This email is already registered.",
    ru: "Этот адрес уже зарегистрирован.",
  },
  USERNAME_TAKEN: {
    az: "Bu istifadəçi adı artıq götürülüb.",
    en: "This username is already taken.",
    ru: "Это имя пользователя уже занято.",
  },
  INVALID_CREDENTIALS: {
    az: "E-poçt və ya şifrə yanlışdır.",
    en: "Email or password is incorrect.",
    ru: "Неверный адрес электронной почты или пароль.",
  },
  EMAIL_NOT_VERIFIED: {
    az: "E-poçtunuzu təsdiqləyin.",
    en: "Please verify your email.",
    ru: "Подтвердите адрес электронной почты.",
  },
  SESSION_EXPIRED: {
    az: "Oyun sessiyasının vaxtı bitdi.",
    en: "The game session has expired.",
    ru: "Игровая сессия истекла.",
  },
  SESSION_FINISHED: {
    az: "Bu sessiya artıq bitib.",
    en: "This session has already finished.",
    ru: "Эта сессия уже завершена.",
  },
  SESSION_FORBIDDEN: {
    az: "Bu sessiya sizə aid deyil.",
    en: "This session does not belong to you.",
    ru: "Эта сессия вам не принадлежит.",
  },
  ACCOUNT_BLOCKED: {
    az: "Hesabınız bloklanıb.",
    en: "Your account is blocked.",
    ru: "Ваш аккаунт заблокирован.",
  },
  ACCOUNT_DELETED: {
    az: "Hesabınız silinib.",
    en: "Your account has been deleted.",
    ru: "Ваш аккаунт удалён.",
  },
  TOKEN_INVALID: {
    az: "Keçid etibarsızdır və ya vaxtı bitib.",
    en: "This link is invalid or expired.",
    ru: "Ссылка недействительна или истекла.",
  },
  OAUTH_NOT_CONFIGURED: {
    az: "Google girişi konfiqurasiya edilməyib.",
    en: "Google sign-in is not configured.",
    ru: "Вход через Google не настроен.",
  },
  OAUTH_FAILED: {
    az: "Google girişi uğursuz oldu.",
    en: "Google sign-in failed.",
    ru: "Вход через Google не удался.",
  },
  GUEST_IMPORTED: {
    az: "Qonaq nəticələri artıq köçürülüb.",
    en: "Guest records have already been imported.",
    ru: "Гостевые результаты уже импортированы.",
  },
  AGE_REQUIRED: {
    az: "16 yaşınızın olmasını təsdiqləməlisiniz.",
    en: "You must confirm that you are 16 or older.",
    ru: "Необходимо подтвердить, что вам 16 лет или больше.",
  },
};

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = messages[key]?.[locale] ?? messages[key]?.en ?? messages.INTERNAL?.en ?? key;
  for (const [name, value] of Object.entries(params ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
