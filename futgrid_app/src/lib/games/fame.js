import { norm } from "../data";

const CLUB_RULES = [
  [1, /^real madrid( cf)?$/],
  [1, /^(fc )?barcelona$/],
  [1, /^manchester united( fc)?$|^man utd$/],
  [1, /^manchester city( fc)?$|^man city$/],
  [1, /^liverpool( fc)?$/],
  [1, /^chelsea( fc)?$/],
  [1, /^arsenal( fc)?$/],
  [1, /^tottenham( hotspur)?( fc)?$|^spurs$/],
  [1, /^(fc )?bayern( munich| munchen)?$/],
  [1, /^(bv )?borussia dortmund$|^dortmund$/],
  [1, /^juventus( fc)?$/],
  [1, /^(fc )?inter( milan)?$|^internazionale( milano)?$/],
  [1, /^(ac )?milan$/],
  [1, /^paris saint germain( fc)?$|^psg$|^paris sg$/],
  [1, /^(club )?atletico( de)? madrid$/],
  [1, /^(afc )?ajax( amsterdam)?$/],
  [1, /^(sl )?benfica$/],
  [1, /^(fc )?porto$/],
  [1, /^(ssc )?napoli$/],
  [2, /^sevilla( fc)?$/],
  [2, /^valencia( cf)?$/],
  [2, /^villarreal( cf)?$/],
  [2, /^athletic (club|bilbao)$/],
  [2, /^real sociedad$/],
  [2, /^real betis( balompie)?$/],
  [2, /^(bayer )?(04 )?leverkusen$|^bayer 04 leverkusen$/],
  [2, /^(rb |rasenballsport )?leipzig$/],
  [2, /^(fc )?schalke( 04)?$/],
  [2, /^(vfl )?wolfsburg$/],
  [2, /^(borussia )?monchengladbach$|^gladbach$/],
  [2, /^(as )?roma$/],
  [2, /^(ss )?lazio$/],
  [2, /^atalanta( bc)?$/],
  [2, /^(acf )?fiorentina$/],
  [2, /^(olympique (de )?)?marseille$/],
  [2, /^(olympique )?lyon(nais)?$/],
  [2, /^(as )?monaco$/],
  [2, /^(losc )?lille( osc)?$/],
  [2, /^sporting( cp| lisbon| clube de portugal)?$/],
  [2, /^psv( eindhoven)?$/],
  [2, /^feyenoord( rotterdam)?$/],
  [2, /^celtic( fc)?$/],
  [2, /^rangers( fc)?$/],
  [2, /^galatasaray$/],
  [2, /^fenerbahce$/],
  [2, /^besiktas$/],
  [2, /^everton( fc)?$/],
  [2, /^newcastle( united)?$/],
  [2, /^aston villa$/],
  [2, /^west ham( united)?$/],
  [2, /^leicester( city)?$/],
  [2, /^shakhtar( donetsk)?$/],
  [2, /^d[iy]namo (kyiv|kiev)$/],
  [2, /^zenit( st petersburg| saint petersburg)?$/],
  [2, /^olympiak?c?os( piraeus)?$/],
  [2, /^(cr )?flamengo$/],
  [2, /^boca juniors$/],
  [2, /^river plate$/],
  [2, /^santos( fc)?$/],
  [2, /^al nassr$/],
  [2, /^al hilal$/],
  [2, /^inter miami( cf)?$/],
  [2, /^(la )?galaxy$|^los angeles galaxy$/],
  [2, /^qarabag( fk)?$/],
];

const COUNTRY_TIER = {
  BR: 1, AR: 1, FR: 1, DE: 1, ES: 1, "GB-ENG": 1, IT: 1, PT: 1, NL: 1, BE: 1, HR: 1, UY: 1,
  CO: 2, MX: 2, US: 2, DK: 2, SE: 2, NO: 2, PL: 2, CH: 2, AT: 2, RS: 2, TR: 2, MA: 2,
  SN: 2, NG: 2, GH: 2, CI: 2, EG: 2, CM: 2, DZ: 2, JP: 2, KR: 2, "GB-SCT": 2, "GB-WLS": 2,
  UA: 2, CZ: 2, CL: 2, EC: 2, RU: 2, GR: 2, IE: 2, AZ: 2,
};

const COACH_EASY = [
  "jose-mourinho", "pep-guardiola", "jurgen-klopp", "carlo-ancelotti", "zinedine-zidane",
  "diego-simeone", "antonio-conte", "thomas-tuchel", "mikel-arteta", "xavi", "luis-enrique",
  "massimiliano-allegri", "arsene-wenger", "sir-alex-ferguson", "mauricio-pochettino",
  "erik-ten-hag", "unai-emery", "julian-nagelsmann", "hansi-flick", "xabi-alonso", "arne-slot",
  "vincent-kompany", "ruben-amorim", "didier-deschamps",
];

const COACH_NORMAL = [
  "maurizio-sarri", "rafael-benitez", "claudio-ranieri", "brendan-rodgers", "stefano-pioli",
  "ronald-koeman", "frank-lampard", "ole-gunnar-solskjaer", "roberto-mancini", "luciano-spalletti",
  "simone-inzaghi", "gian-piero-gasperini", "marcelo-bielsa", "quique-setien", "ernesto-valverde",
  "julen-lopetegui", "louis-van-gaal", "vicente-del-bosque", "joachim-low", "fabio-capello",
  "marcello-lippi", "guus-hiddink", "jupp-heynckes", "ottmar-hitzfeld", "manuel-pellegrini",
  "roberto-martinez", "gareth-southgate", "niko-kovac", "nuno-espirito-santo", "ange-postecoglou",
  "enzo-maresca", "oliver-glasner", "thiago-motta", "roberto-de-zerbi", "graham-potter",
  "david-moyes", "sergio-conceicao", "paulo-fonseca", "marco-silva", "lucien-favre",
  "andre-villas-boas", "cesare-prandelli", "tite", "lionel-scaloni", "jorge-jesus",
  "gennaro-gattuso", "andrea-pirlo", "igor-tudor",
];

const COACH_TIER = new Map([
  ...COACH_NORMAL.map((id) => [id, 2]),
  ...COACH_EASY.map((id) => [id, 1]),
]);

export function clubFameTier(club) {
  const keys = [norm(club?.name), norm(club?.slug)];
  for (const [tier, re] of CLUB_RULES) if (keys.some((k) => k && re.test(k))) return tier;
  return 3;
}

export function clubFameReady(data) {
  if (data._clubFameReady !== undefined) return data._clubFameReady;
  const easy = data.clubs.filter((c) => clubFameTier(c) === 1).length;
  data._clubFameReady = easy >= 10;
  return data._clubFameReady;
}

export const countryFameTier = (code) => COUNTRY_TIER[code] ?? 3;

export const coachFameTier = (id) => COACH_TIER.get(id) ?? 3;

const TROPHY_WEIGHT = {
  ballon_dor: 3,
  world_cup: 1.5,
  ucl: 1,
  euro: 0.8,
  copa_america: 0.8,
  premier_league: 0.3,
  la_liga: 0.3,
  serie_a: 0.3,
  bundesliga: 0.3,
  ligue_1: 0.2,
};

export function playerFame(p) {
  if (p._fame !== undefined) return p._fame;
  const value = Math.max(
    p.market_value?.amount_eur ?? 0,
    p.market_value?.highest_eur ?? 0,
    1e5,
  );
  const v = Math.max(0, Math.log10(value / 1e6));
  const caps = Math.min(p.international?.caps ?? 0, 150) / 60;
  let t = 0;
  for (const tr of p.trophies ?? [])
    t += (TROPHY_WEIGHT[tr.id] ?? 0) * Math.min(tr.count ?? 1, 5);
  p._fame = v * 1.2 + caps + Math.min(t, 6);
  return p._fame;
}

export const byFame = (a, b) => playerFame(b) - playerFame(a);
