import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Flag, RotateCcw, Timer } from "lucide-react";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import {
  PENALTY,
  countFor,
  examples,
  hasLetters,
  letterOptions,
} from "../../../lib/games/twoLetters";
import { SIDES } from "../ortaq/settings";
import NameGuess from "../common/NameGuess";
import DuelLobby from "../common/DuelLobby";
import OnlineSetup from "../common/OnlineSetup";
import { Field, Segmented } from "../common/controls";
import {
  DuelFooter,
  nameOf,
  stepKeyOf,
  useDuelClock,
  useStepFeedback,
} from "../common/DuelKit";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { LetterGrid, Marked, Scoreboard, Tiles } from "./TwoLettersGame";
import { LEVELS, TARGETS, TIMES } from "./options";
import { tr } from "../../../i18n";

const labelOf = (list, value) =>
  list.find((o) => o.value === value)?.label ?? String(value);

export function twoLettersSummary(settings) {
  if (!settings) return [];
  return [
    { label: tr("Çətinlik"), value: labelOf(LEVELS, settings.difficulty) },
    { label: tr("Növbə vaxtı"), value: labelOf(TIMES, settings.seconds) },
    { label: tr("Qələbə xalı"), value: labelOf(TARGETS, settings.target) },
  ];
}

function Setup({ settings, onChange, create, connected, onBack }) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  return (
    <OnlineSetup
      sub={tr(
        "Hər biriniz bir hərf seçir. Sonra növbə ilə adında hər iki hərf olan futbolçu yazırsınız. Vaxtında tapa bilməyən raundu uduzur.",
      )}
      onCreate={() =>
        create({
          difficulty: settings.difficulty,
          seconds: settings.seconds,
          target: settings.target,
        })
      }
      onBack={onBack}
      connected={connected}
    >
      <Field label={tr("Çətinlik")}>
        <Segmented
          label={tr("Çətinlik")}
          options={LEVELS}
          value={settings.difficulty}
          onChange={set("difficulty")}
        />
      </Field>
      <Field label={tr("Növbə vaxtı")}>
        <Segmented
          label={tr("Növbə vaxtı")}
          options={TIMES}
          value={settings.seconds}
          onChange={set("seconds")}
        />
      </Field>
      <Field label={tr("Qələbə xalı")}>
        <Segmented
          label={tr("Qələbə xalı")}
          options={TARGETS}
          value={settings.target}
          onChange={set("target")}
        />
      </Field>
    </OnlineSetup>
  );
}

function Match({ duel, data }) {
  const settings = duel.room?.settings ?? {};
  const state = duel.room?.state ?? {};
  const playing = duel.room?.status === "playing";
  const now = useDuelClock(duel, playing, 250);
  const [error, setError] = useStepFeedback(stepKeyOf(state));
  const [picked, setPicked] = useState({ key: "", letter: null });

  const me = duel.myId;
  const opp = duel.opponent?.id;
  const sideOf = (seat) => (seat === me ? "A" : "B");
  const names = { A: nameOf(duel.me), B: nameOf(duel.opponent) };
  const phase = state.phase;
  const letters = useMemo(() => state.letters ?? [], [state.letters]);
  const difficulty = settings.difficulty ?? "normal";
  const seconds = state.seconds ?? settings.seconds ?? 15;
  const starter = state.starter;
  const tileSides = [sideOf(starter), sideOf(starter === me ? opp : me)];
  const myPick = playing && phase === "pick" && state.picker === me;
  const pickKey = `${state.round}-${letters.length}`;
  const chosen = picked.key === pickKey ? picked.letter : null;
  const options = useMemo(
    () => letterOptions(data, letters[0] ?? null, difficulty),
    [data, letters, difficulty],
  );
  const myTurn = playing && phase === "play" && state.turn === me;
  const left =
    playing && state.deadline
      ? Math.max(0, Math.ceil((state.deadline - now) / 1000))
      : 0;
  const scores = { A: state.scores?.[me] ?? 0, B: state.scores?.[opp] ?? 0 };
  const used = (state.used ?? []).map((u) => ({
    player: data.playersById.get(u.playerId) ?? { id: u.playerId, name: "?" },
    side: sideOf(u.seat),
  }));
  const result = state.result;
  const iReady = (state.ready ?? []).includes(me);

  const send = async (payload) => {
    const res = await duel.move(payload);
    if (res?.error)
      setError(
        res.error.code === "PLAYER_USED"
          ? tr("{name} artıq yazılıb", { name: payload.name ?? "" })
          : duelErrorText(res.error.code),
      );
    return res;
  };

  const e = state.lastEvent;
  const fresh = e && now - (e.at ?? 0) < 2400;
  let message = error ? { bad: true, text: error } : null;
  if (!message && fresh && phase === "play") {
    if (e.type === "wrong")
      message = {
        bad: true,
        text: tr("{name} adında hər iki hərf yoxdur", { name: e.name }),
      };
    else if (e.type === "correct")
      message = { bad: false, text: tr("{name} ✓", { name: e.name }) };
  }
  const shakeKey = e?.type === "wrong" ? e.at : 0;

  const sub = (side) => {
    const seat = side === "A" ? me : opp;
    if (phase === "pick") {
      const i = [starter, starter === me ? opp : me].indexOf(seat);
      if (letters[i]) return tr("{l} seçdi", { l: letters[i] });
      return state.picker === seat ? tr("seçir...") : tr("gözləyir");
    }
    if (phase === "play") {
      const n = used.filter((u) => u.side === side).length;
      if (state.turn === seat)
        return seat === me ? tr("növbə səndədir") : tr("düşünür…");
      return tr("{n} tapdı", { n });
    }
    return result?.winner === seat ? tr("raund qalibi") : "";
  };
  const activeSeat =
    phase === "pick"
      ? state.picker
      : phase === "play"
        ? state.turn
        : result?.winner;
  const active = activeSeat ? sideOf(activeSeat) : null;
  const s = SIDES[active ?? "A"];
  const danger = phase === "play" && left <= 5;
  const nextIn = phase === "round" && state.deadline ? left : null;

  return (
    <div className="mx-auto max-w-4xl">
      <p
        className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}
      >
        {tr("Raund {n}", { n: state.round ?? 1 })} ·{" "}
        {tr("{n} xala qədər", { n: state.target ?? settings.target })}
      </p>
      <Scoreboard
        names={names}
        scores={scores}
        active={active}
        subs={{ A: sub("A"), B: sub("B") }}
      />

      {phase === "pick" && (
        <section
          key={`pick-${pickKey}`}
          className="mt-4 rounded-2xl border border-edge bg-surface p-4 animate-[thIn_0.35s_ease-out_both] md:p-6"
        >
          {myPick ? (
            <>
              <h2
                className={`${FONT} text-xl font-black uppercase leading-tight md:text-3xl ${SIDES.A.text}`}
              >
                {tr("{name}, hərfini seç", { name: names.A })}
              </h2>
              <p className={`mt-1 ${FONT} text-[13px] text-muted md:text-base`}>
                {letters.length
                  ? tr("{name} {l} seçdi. İndi ikinci hərfi sən seç.", {
                      name: names.B,
                      l: letters[0],
                    })
                  : tr(
                      "Birinci hərfi seç. Sonra rəqibin ikinci hərfi seçəcək.",
                    )}
              </p>
            </>
          ) : (
            <>
              <h2
                className={`${FONT} text-xl font-black uppercase leading-tight md:text-3xl ${SIDES.B.text}`}
              >
                {tr("{name} hərf seçir…", { name: names.B })}
              </h2>
              <p className={`mt-1 ${FONT} text-[13px] text-muted md:text-base`}>
                {letters.length
                  ? tr("Sən {l} seçdin. Rəqib ikinci hərfi seçir.", {
                      l: letters[0],
                    })
                  : tr("Birinci hərfi rəqib seçir, ikincini sən seçəcəksən.")}
              </p>
            </>
          )}
          <div className="mt-4">
            <Tiles
              letters={[
                letters[0] ?? (letters.length === 0 ? chosen : null),
                letters.length === 1 ? chosen : null,
              ]}
              sides={tileSides}
              size="lg"
            />
          </div>
          {myPick ? (
            <>
              <div className="mt-5">
                <LetterGrid
                  options={options}
                  taken={letters[0]}
                  picked={chosen}
                  onPick={(l) => setPicked({ key: pickKey, letter: l })}
                  side="A"
                />
              </div>
              {letters.length === 1 && (
                <p className={`mt-3 ${FONT} text-xs text-faint`}>
                  {tr(
                    "Sönük hərflərlə çox az futbolçu var, onları seçmək olmur.",
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={() =>
                  chosen && void send({ action: "letter", letter: chosen })
                }
                disabled={!chosen}
                className={`mt-4 w-full rounded-xl py-3 ${FONT} text-base font-black uppercase tracking-wider transition-opacity duration-200 disabled:opacity-40 ${SIDES.A.solid}`}
              >
                {chosen
                  ? tr("{l} hərfini təsdiqlə", { l: chosen })
                  : tr("Hərf seç")}
              </button>
            </>
          ) : null}
          <p
            className={`mt-3 text-right ${FONT} text-xs tabular-nums text-faint`}
          >
            {tr("{n} san.", { n: left })}
          </p>
        </section>
      )}

      {phase === "play" && (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section
            className={`rounded-2xl border bg-surface p-4 md:p-5 ${myTurn ? "border-accent/50" : "border-edge"}`}
          >
            <Tiles letters={letters} sides={tileSides} size="sm" />
            <p
              className={`mt-2 text-center ${FONT} text-[13px] text-muted md:text-sm`}
            >
              {tr("Adında həm {a}, həm {b} olan futbolçu yaz", {
                a: letters[0],
                b: letters[1],
              })}
            </p>
            <div className="mt-3">
              <div
                className={`flex items-center justify-between ${FONT} text-xs font-black uppercase tracking-wider`}
              >
                <span className={s.text}>
                  {myTurn
                    ? tr("Növbə səndədir!")
                    : tr("Növbə: {name}", { name: names.B })}
                </span>
                <span
                  className={`relative flex items-center gap-1 tabular-nums ${danger ? "text-bad" : "text-ink"}`}
                >
                  <Timer className="h-3.5 w-3.5" />
                  0:{String(left).padStart(2, "0")}
                  {state.penalties > 0 && (
                    <span
                      key={state.penalties}
                      className="pointer-events-none absolute -top-4 right-0 text-bad animate-[thUp_1s_ease-out_forwards]"
                    >
                      −{PENALTY}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/10">
                <span
                  className={`block h-full rounded-full transition-[width] duration-300 ease-linear ${danger ? "bg-bad" : state.turn === me ? "bg-accent" : "bg-gold"}`}
                  style={{
                    width: `${Math.max(0, Math.min(1, left / seconds)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div
              key={shakeKey}
              className={`mt-3 ${shakeKey ? "animate-[thShake_0.35s_ease-out]" : ""}`}
            >
              <NameGuess
                data={data}
                disabled={!myTurn}
                onGuess={(p) =>
                  void send({ action: "answer", playerId: p.id, name: p.name })
                }
                onUnknown={(text) =>
                  setError(
                    tr("“{text}” tanınmadı. Futbolçunun adını tam yaz.", {
                      text,
                    }),
                  )
                }
                pickFrom={(list) =>
                  list.find(
                    (p) =>
                      !used.some((u) => u.player.id === p.id) &&
                      hasLetters(data, p, letters[0], letters[1]),
                  ) ?? list[0]
                }
                focusKey={`${state.round}-${used.length}-${state.turn}`}
                placeholder={myTurn ? undefined : tr("Rəqibin növbəsidir")}
              />
            </div>
            <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
              {message ? (
                <p
                  className={`${FONT} text-sm font-bold ${message.bad ? "text-bad" : "text-good"}`}
                >
                  {message.text}
                </p>
              ) : (
                <span className={`${FONT} text-xs text-faint`}>
                  {tr("Adı tam yaz, təklif çıxmayacaq")} ·{" "}
                  {tr("Səhv cavab: −{n} saniyə", { n: PENALTY })}
                </span>
              )}
              {myTurn ? (
                <button
                  type="button"
                  onClick={() => void send({ action: "giveup" })}
                  className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-bad`}
                >
                  <Flag className="h-4 w-4" />
                  {tr("Təslim ol")}
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
            <p
              className={`${FONT} text-xs font-black uppercase tracking-[0.18em] text-faint`}
            >
              {tr("Bu raundda yazılanlar · {n}", { n: used.length })}
            </p>
            {used.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {used.map((u) => (
                  <li
                    key={u.player.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-edge bg-page px-2.5 py-1 ${FONT} text-xs font-bold uppercase text-ink animate-[thIn_0.25s_ease-out_both] md:text-sm`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${SIDES[u.side].dot}`}
                    />
                    <Marked name={u.player.name} letters={letters} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-3 ${FONT} text-sm text-muted`}>
                {tr("Hələ heç kim yazmayıb.")}
              </p>
            )}
            <p className={`mt-4 ${FONT} text-xs text-faint`}>
              {tr("Bu hərflərlə təxminən {n} məşhur futbolçu var", {
                n: countFor(data, letters[0], letters[1], difficulty),
              })}
            </p>
          </section>
        </div>
      )}

      {phase === "round" && result && (
        <section className="mt-4 rounded-2xl border border-edge bg-surface p-5 text-center animate-[thIn_0.4s_ease-out_both] md:p-7">
          <Tiles letters={letters} sides={tileSides} size="sm" />
          {
            <>
              <p
                className={`mt-4 ${FONT} text-2xl font-black uppercase leading-tight text-ink md:text-3xl`}
              >
                {result.reason === "time"
                  ? tr("Vaxt bitdi: {name}", {
                      name: names[sideOf(result.loser)],
                    })
                  : tr("{name} təslim oldu", {
                      name: names[sideOf(result.loser)],
                    })}
              </p>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 ${FONT} text-sm font-black uppercase ${SIDES[sideOf(result.winner)].solid}`}
              >
                <Check className="h-4 w-4" />
                {tr("{name} +1 xal", { name: names[sideOf(result.winner)] })}
              </span>
            </>
          }
          <p className={`mt-3 ${FONT} text-sm text-muted`}>
            {tr("Bu raundda {n} futbolçu tapıldı", { n: used.length })}
          </p>
          <div className="mt-4 text-left">
            <p
              className={`${FONT} text-xs font-black uppercase tracking-[0.18em] text-faint`}
            >
              {tr("Yaza biləcəkdiniz")}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {examples(
                data,
                letters[0],
                letters[1],
                used.map((u) => u.player),
              ).map((p) => (
                <li
                  key={p.id}
                  className={`rounded-full border border-edge bg-page px-2.5 py-1 ${FONT} text-xs font-bold uppercase text-ink md:text-sm`}
                >
                  <Marked name={p.name} letters={letters} />
                </li>
              ))}
            </ul>
          </div>
          {playing ? (
            <>
              <button
                type="button"
                onClick={() => void send({ action: "next" })}
                disabled={iReady}
                className={`${BTN_PRIMARY} mt-6 disabled:opacity-60`}
              >
                <span aria-hidden="true" className={SWEEP_WHITE} />
                <RotateCcw className="h-4 w-4" />
                {iReady ? tr("Rəqib gözlənilir…") : tr("Növbəti raund")}
                {nextIn != null ? (
                  <span className="tabular-nums opacity-70">· {nextIn}</span>
                ) : null}
              </button>
              <p className={`mt-2 ${FONT} text-xs text-faint`}>
                {tr("Növbəti raundda ilk hərfi {name} seçir", {
                  name: names[sideOf(starter === me ? opp : me)],
                })}
              </p>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}

export default function TwoLettersDuel({
  data,
  settings,
  onSettingsChange,
  onSettings,
}) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "twoLetters",
    invitedCode: params.get("otaq") ?? "",
  });
  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={twoLettersSummary(duel.room?.settings)}
      setup={({ create, connected }) => (
        <Setup
          settings={settings}
          onChange={onSettingsChange}
          create={create}
          connected={connected}
          onBack={onSettings}
        />
      )}
    >
      <div className="space-y-4">
        <Match duel={duel} data={data} />
        <DuelFooter duel={duel} onSettings={onSettings} />
      </div>
    </DuelLobby>
  );
}
