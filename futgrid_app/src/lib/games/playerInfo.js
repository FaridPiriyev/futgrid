import { countryName } from "./x0xCategories";
import { tr } from "../../i18n";

export const POS_SHORT = {
  get GK() {
    return tr("QAP");
  },
  get DF() {
    return tr("MÜD");
  },
  get MF() {
    return tr("YAR");
  },
  get FW() {
    return tr("HÜC");
  },
};
export const POS_NAME = {
  get GK() {
    return tr("Qapıçı");
  },
  get DF() {
    return tr("Müdafiəçi");
  },
  get MF() {
    return tr("Yarımmüdafiəçi");
  },
  get FW() {
    return tr("Hücumçu");
  },
};
export const POS_STYLE = {
  GK: "bg-gold/15 text-gold-hi",
  DF: "bg-good/15 text-good-hi",
  MF: "bg-accent/15 text-accent-hi",
  FW: "bg-bad/15 text-bad-hi",
};

export function clubOf(data, p) {
  const club = p.current_club_id ? data.clubsById.get(p.current_club_id) : null;
  if (club) return { name: club.name, logo: club.logo_url ?? null };
  if (p.current_club_name) return { name: p.current_club_name, logo: null };
  return null;
}

export function countryOf(data, p) {
  const code = p.nationality_code;
  if (!code) return null;
  const info = data.countriesByCode.get(code);
  return {
    code,
    name: countryName(code, data),
    flags: [info?.flag_url, `https://flagcdn.com/${code.toLowerCase()}.svg`].filter(
      Boolean,
    ),
  };
}

export function ageOf(p) {
  if (!p.birth_date) return null;
  const b = new Date(p.birth_date);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function euro(n) {
  if (!n) return "€0";
  if (n >= 1e6) {
    const m = n / 1e6;
    return `€${m >= 10 ? Math.round(m) : Number(m.toFixed(1))}m`;
  }
  if (n >= 1e3) return `€${Math.round(n / 1e3)}k`;
  return `€${n}`;
}

export const initials = (name) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
