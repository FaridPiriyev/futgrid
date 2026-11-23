import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, BellRing, Lock } from "lucide-react";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import { SIDES } from "../ortaq/settings";
import PlayerSearch from "../common/PlayerSearch";
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
import { RevealCard } from "../sual/SualParts";
import PixelBoard, { TileMeter } from "./PixelBoard";
import { ERAS, GRID_OPTIONS, LEVELS, SPEEDS, TARGETS } from "./options";
import { tr } from "../../../i18n";

const labelOf = (list, value) =>
  list.find((o) => o.value === value)?.label ?? String(value);

export function pixelSummary(settings) {
  if (!settings) return [];
  return [
    { label: tr("Qələbə üçün"), value: labelOf(TARGETS, settings.target) },
    { label: tr("Xana sayı"), value: labelOf(GRID_OPTIONS, settings.grid) },
    { label: tr("Çətinlik"), value: labelOf(LEVELS, settings.difficulty) },
    { label: tr("Dövr"), value: labelOf(ERAS, settings.era) },
    { label: tr("Açılma sürəti"), value: labelOf(SPEEDS, settings.speed) },
  ];
}

function Setup({ settings, onChange, create, connected, onBack }) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  return (
    <OnlineSetup
      sub={tr(
        "Şəkil hər ikiniz üçün eyni vaxtda açılır. Tanıyan düyməsini basır və adı yazır. Düz cavab xal gətirir, səhv cavab verən bir neçə xana gözləyir.",
      )}
      onCreate={() =>
        create({
          grid: settings.grid,
          difficulty: settings.difficulty,
          era: settings.era,
          speed: settings.speed,
          target: settings.target,
        })
      }
      onBack={onBack}
      connected={connected}
    >
      <Field label={tr("Xana sayı")}>
        <Segmented
          label={tr("Xana sayı")}
          options={GRID_OPTIONS}
          value={settings.grid}
          onChange={set("grid")}
        />
      </Field>
      <Field label={tr("Çətinlik")}>
        <Segmented
          label={tr("Çətinlik")}
          options={LEVELS}
          value={settings.difficulty}
          onChange={set("difficulty")}
        />
      </Field>
      <Field label={tr("Dövr")}>
        <Segmented
          label={tr("Dövr")}
          options={ERAS}
          value={settings.era}
          onChange={set("era")}
        />
      </Field>
      <Field label={tr("Açılma sürəti")} hint={tr("hər xana üçün")}>
        <Segmented
          label={tr("Açılma sürəti")}
          options={SPEEDS}
          value={settings.speed}
          onChange={set("speed")}
        />
      </Field>
      <Field label={tr("Qələbə üçün")}>
        <Segmented
          label={tr("Qələbə üçün")}
          options={TARGETS}
          value={settings.target}
          onChange={set("target")}
        />
      </Field>
    </OnlineSetup>
  );
}

function BuzzButton({ name, locked, wait, onBuzz, disabled }) {
  const s = SIDES.A;
  return (
    <button
      type="button"
      onClick={onBuzz}
      disabled={disabled || locked}
      style={{ "--px-glow": s.glow }}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 transition-[transform,opacity] duration-150 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 disabled:cursor-not-allowed md:py-5 ${
        locked ? "border-edge bg-page-2 opacity-60" : `${s.border} ${s.solid}`
      } ${!locked && !disabled ? "animate-[pxBuzz_1.6s_ease-in-out_infinite]" : ""}`}
    >
      {locked ? (
        <Lock className="h-6 w-6 text-muted" />
      ) : (
        <BellRing className="h-6 w-6" />
      )}
      <span
        className={`max-w-full text-center ${FONT} text-base font-black uppercase leading-tight [overflow-wrap:anywhere] md:text-xl ${locked ? "text-muted" : ""}`}
      >
        {locked
          ? wait > 0
            ? tr("{n} xana sonra açılır", { n: wait })
            : tr("Bu raund bağlıdır")
          : tr("{name} bilir!", { name })}
      </span>
      {!locked && (
        <span
          className={`hidden ${FONT} text-[11px] font-bold uppercase tracking-wider opacity-80 md:block`}
        >
          {tr("klaviatura: boşluq")}
        </span>
      )}
    </button>
  );
}

function Match({ duel, data }) {
  const settings = duel.room?.settings ?? {};
  const state = duel.room?.state ?? {};
  const playing = duel.room?.status === "playing";
  const now = useDuelClock(duel, playing, 200);
  const [error, setError] = useStepFeedback(stepKeyOf(state));

  const me = duel.myId;
  const opp = duel.opponent?.id;
  const names = { A: nameOf(duel.me), B: nameOf(duel.opponent) };
  const size = state.size ?? settings.grid ?? 16;
  const opened = state.opened ?? 0;
  const live = playing && state.phase === "play";
  const started = live && now >= (state.startAt ?? 0);
  const answering = state.answering;
  const lockUntil = state.lockUntil ?? {};
  const locked = (seat) => opened < (lockUntil[seat] ?? 0);
  const waitFor = (seat) =>
    (lockUntil[seat] ?? 0) > size
      ? 0
      : Math.max(0, (lockUntil[seat] ?? 0) - opened);
  const canBuzz = started && !answering && !locked(me);
  const scores = { A: state.scores?.[me] ?? 0, B: state.scores?.[opp] ?? 0 };
  const result = state.result;
  const iReady = (state.ready ?? []).includes(me);
  const secs = (t) => (t ? Math.max(0, Math.ceil((t - now) / 1000)) : 0);
  const answerLeft = secs(state.answerDeadline);
  const lastCall =
    opened >= size
      ? state.paused != null
        ? Math.ceil(state.paused / 1000)
        : secs(state.lastCallEnd)
      : null;
  const nextIn =
    state.phase === "round" && playing ? secs(state.deadline) : null;
  const photo = useMemo(
    () => ({ id: `r${state.round}`, photo_url: state.photoUrl }),
    [state.round, state.photoUrl],
  );
  const order = useMemo(() => state.order ?? [], [state.order]);
  const found = result?.playerId ? data.playersById.get(result.playerId) : null;

  const send = async (payload) => {
    const res = await duel.move(payload);
    if (res?.error) setError(duelErrorText(res.error.code));
  };

  // Masaüstündə boşluq, A və ya L ilə də "bilirəm" demək olar.
  const buzzRef = useRef(null);
  buzzRef.current = canBuzz ? () => void send({ action: "buzz" }) : null;
  useEffect(() => {
    const onKey = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (![" ", "a", "l"].includes(event.key.toLowerCase())) return;
      event.preventDefault();
      buzzRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const e = state.lastEvent;
  let message = error ? { text: error } : null;
  if (!message && e?.type === "wrong" && live && now - e.at < 4000) {
    const who = e.seat === me ? names.A : names.B;
    const why = e.timeout
      ? tr("Vaxt bitdi")
      : tr("{name} deyil", { name: e.name });
    message = {
      text:
        (e.until ?? 0) > size
          ? `${why} · ${tr("{name} bu raundda daha cavab verə bilməz", { name: who })}`
          : `${why} · ${tr("{name} növbəti {n} xana açılana qədər gözləyir", { name: who, n: state.lockTiles ?? 4 })}`,
    };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
        {["A", "B"].map((side) => {
          const seat = side === "A" ? me : opp;
          return (
            <div
              key={side}
              className={`flex min-w-0 items-center gap-2 rounded-xl border-2 bg-surface px-2.5 py-2 md:gap-2.5 md:px-4 md:py-3 ${side === "B" ? "order-3 flex-row-reverse text-right" : ""} ${
                answering === seat ? SIDES[side].border : "border-edge"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full md:h-9 md:w-9 ${SIDES[side].solid} ${FONT} text-sm font-black md:text-base`}
              >
                {(names[side][0] ?? "?").toUpperCase()}
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate ${FONT} text-sm font-black uppercase text-ink md:text-lg`}
                >
                  {names[side]}
                </span>
                {live && locked(seat) ? (
                  <span
                    className={`flex items-center gap-1 ${FONT} text-[11px] text-bad-hi md:text-xs ${side === "B" ? "justify-end" : ""}`}
                  >
                    <Lock className="h-3 w-3" />
                    {waitFor(seat) > 0
                      ? tr("{n} xana gözləyir", { n: waitFor(seat) })
                      : tr("bağlıdır")}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
        <span
          className={`order-2 ${FONT} text-3xl font-black tabular-nums text-ink md:text-4xl`}
        >
          {scores.A}
          <span className="mx-1 text-faint">:</span>
          {scores.B}
        </span>
      </div>
      <p
        className={`mt-2 text-center ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}
      >
        {tr("Raund {n}", { n: state.round ?? 1 })} ·{" "}
        {tr("{n} xala qədər", { n: state.target ?? settings.target })}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-start">
        <div className="mx-auto w-full max-w-[18rem] sm:max-w-[24rem] md:max-w-none">
          {state.photoUrl ? (
            <PixelBoard
              player={photo}
              size={size}
              order={order}
              opened={opened}
              all={!live}
            />
          ) : null}
          <div className="mt-3">
            <TileMeter size={size} opened={live ? opened : size} />
          </div>
        </div>

        <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
          {live ? (
            answering === me ? (
              <div
                key={`me-${e?.at}`}
                className="animate-[pxIn_0.25s_ease-out_both]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2
                    className={`${FONT} text-2xl font-black uppercase leading-tight ${SIDES.A.text}`}
                  >
                    {tr("{name} cavab verir", { name: names.A })}
                  </h2>
                  <span
                    className={`${FONT} text-xl font-black tabular-nums ${answerLeft <= 3 ? "text-bad" : "text-ink"}`}
                  >
                    {answerLeft}
                  </span>
                </div>
                <p className={`mt-1 ${FONT} text-sm text-muted`}>
                  {tr("Xanalar dayandı. Futbolçunun adını yaz.")}
                </p>
                <div className="mt-3">
                  <PlayerSearch
                    data={data}
                    onSelect={(p) =>
                      void send({ action: "answer", playerId: p.id })
                    }
                    focusKey={`answer-${e?.at}`}
                    placeholder={tr("Futbolçunun adını yaz...")}
                  />
                </div>
              </div>
            ) : answering ? (
              <div key="opp" className="animate-[pxIn_0.25s_ease-out_both]">
                <div className="flex items-center justify-between gap-3">
                  <h2
                    className={`${FONT} text-2xl font-black uppercase leading-tight ${SIDES.B.text}`}
                  >
                    {tr("{name} cavab verir", { name: names.B })}
                  </h2>
                  <span
                    className={`${FONT} text-xl font-black tabular-nums ${answerLeft <= 3 ? "text-bad" : "text-ink"}`}
                  >
                    {answerLeft}
                  </span>
                </div>
                <p className={`mt-1 ${FONT} text-sm text-muted`}>
                  {tr("Xanalar dayandı. Rəqib səhv etsə, şans sənə keçir.")}
                </p>
              </div>
            ) : (
              <>
                <h2
                  className={`${FONT} text-2xl font-black uppercase leading-tight text-ink md:text-3xl`}
                >
                  {started ? tr("Kimdir bu?") : tr("Hazırlaş…")}
                </h2>
                <p
                  className={`mt-1 ${FONT} text-sm text-muted ${opened < size ? "hidden sm:block" : ""}`}
                >
                  {opened < size
                    ? tr(
                        "Tanıyan kimi düyməni bas. İlk düz cavab raundu qazanır, səhv cavab verən növbəti 4 xana açılana qədər gözləyir.",
                      )
                    : tr("Bütün xanalar açıldı: son {n} saniyə!", {
                        n: lastCall ?? 0,
                      })}
                </p>
                <div className="mt-4 flex gap-3">
                  <BuzzButton
                    name={names.A}
                    locked={locked(me)}
                    wait={waitFor(me)}
                    onBuzz={() => void send({ action: "buzz" })}
                    disabled={!canBuzz}
                  />
                </div>
                {message ? (
                  <p className={`mt-3 ${FONT} text-sm font-bold text-bad`}>
                    {message.text}
                  </p>
                ) : locked(opp) ? (
                  <p className={`mt-3 ${FONT} text-sm font-bold text-yellow`}>
                    {tr("{opp} kilidlidir — fürsəti qaçırma!", {
                      opp: names.B,
                    })}
                  </p>
                ) : null}
              </>
            )
          ) : (
            <div className="animate-[pxIn_0.35s_ease-out_both]">
              {
                <p
                  className={`${FONT} text-2xl font-black uppercase leading-tight ${result?.winner ? SIDES[result.winner === me ? "A" : "B"].text : "text-bad"}`}
                >
                  {result?.winner
                    ? tr("{name} tapdı! {n} xana açılmışdı", {
                        name: result.winner === me ? names.A : names.B,
                        n: result.opened,
                      })
                    : tr("Heç kim tapa bilmədi")}
                </p>
              }
              {found ? (
                <div className="mt-3">
                  <RevealCard
                    data={data}
                    player={found}
                    tone={
                      result?.winner
                        ? SIDES[result.winner === me ? "A" : "B"].border
                        : "border-bad"
                    }
                  />
                </div>
              ) : null}
              {playing && state.phase === "round" ? (
                <button
                  type="button"
                  onClick={() => void send({ action: "next" })}
                  disabled={iReady}
                  className={`${BTN_PRIMARY} mt-5 disabled:opacity-60`}
                >
                  <span aria-hidden="true" className={SWEEP_WHITE} />
                  <ArrowRight className="h-4 w-4" />
                  {iReady ? tr("Rəqib gözlənilir…") : tr("Növbəti raund")}
                  {nextIn != null ? (
                    <span className="tabular-nums opacity-70">· {nextIn}</span>
                  ) : null}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function PixelDuel({
  data,
  settings,
  onSettingsChange,
  onSettings,
}) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "sekil",
    invitedCode: params.get("otaq") ?? "",
  });
  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={pixelSummary(duel.room?.settings)}
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
