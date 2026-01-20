"use client";

import { useMemo, useState } from "react";
import famousBirthdaysData from "./data/famousBirthdays.json";
import { notes } from "./data/notes";
import { blurredFacts } from "./data/blurredFacts";

type FamousEntry = {
  name: string;
  year: number | null;
  place: string | null;
  note?: string;
};

// JSON vie mať trošku iný tvar (null/extra polia). Tu to znormalizujeme typovo.
const famousBirthdays = famousBirthdaysData as unknown as Record<string, FamousEntry[]>;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function mmdd(date: Date) {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISODate(iso: string): Date | null {
  // input type="date" -> YYYY-MM-DD
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function daysAlive(birth: Date, now = new Date()) {
  const ms = 24 * 60 * 60 * 1000;
  const b = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const n = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((n - b) / ms));
}

function getAge(birth: Date, now = new Date()) {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function daysUntilNextBirthday(birth: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  const target = thisYear >= today ? thisYear : new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());

  const ms = 24 * 60 * 60 * 1000;
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.max(0, Math.floor((b - a) / ms));
}

function westernZodiac(date: Date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Vodnár";
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return "Ryby";
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Baran";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Býk";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Blíženci";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Rak";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Lev";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Panna";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Váhy";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Škorpión";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Strelec";
  return "Kozorožec";
}

function chineseZodiac(year: number) {
  const animals = [
    "Potkan",
    "Byvol",
    "Tiger",
    "Zajac",
    "Drak",
    "Had",
    "Kôň",
    "Koza",
    "Opica",
    "Kohút",
    "Pes",
    "Prasa",
  ];
  // 2008 = Potkan (index 0)
  const idx = ((year - 2008) % 12 + 12) % 12;
  return animals[idx];
}

function hashString(s: string) {
  // jednoduchý deterministický hash
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("sk-SK").format(Math.round(n));
}

function approxLifeStats(days: number) {
  // hrubé priemery, lebo toto je web, nie kardiologická klinika
  const heartbeats = days * 100_000; // ~100k/deň
  const breaths = days * 20_000; // ~20k/deň
  const blinks = days * 15_000; // ~15k/deň
  return { heartbeats, breaths, blinks };
}

function applyTemplate(tpl: string, vars: Record<string, string>) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

function hashString(s: string) {
  // jednoduchý deterministický hash
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: string) {
  if (!arr.length) throw new Error("pick() empty array");
  const idx = hashString(seed) % arr.length;
  return arr[idx];
}

function formatFamous(e: FamousEntry) {
  const place = e.place ? ` – ${e.place}` : "";
  const year = e.year ? ` (${e.year})` : "";
  return `${e.name}${year}${place}`;
}

export default function Home() {
  const [name, setName] = useState("");
  const [birthISO, setBirthISO] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const computed = useMemo(() => {
    if (!submitted) return null;

    const cleanName = name.trim();
    const birth = parseISODate(birthISO);
    if (!cleanName || !birth) return { error: "Zadaj meno aj dátum (cez kalendárik)." as const };

    const key = mmdd(birth);
    const list = famousBirthdays[key] ?? [];
    const famous = list.length ? list[hashString(key) % list.length] : null;

        const zodiac = westernZodiac(birth);
    const cz = chineseZodiac(birth.getFullYear());
    const alive = daysAlive(birth);
    const age = getAge(birth);

    const key = mmdd(birth);
    const list = famousBirthdays[key] ?? [];
    const famous = list.length ? list[hashString(key) % list.length] : null;

    // --- poznámky / texty (deterministicky) ---
    const zodiacNote = pick(notes.westernZodiac, `${key}|z`);
    const chineseNote = pick(notes.chineseZodiac, `${key}|c`);
    const daysNote = pick(notes.daysAlive, `${key}|d`);

    // keď nemáš v notes.ts sekciu nextBirthday, použijeme fallback, aby to nebolo furt to isté.
    const nextBirthdayPool: string[] = (notes as any).nextBirthday ?? [
      "Do narodenín: {days} dní. Už len zistiť, kto ti spraví oslavu.",
      "{days} dní do narodenín. To je presne {days} príležitostí to odkladať.",
      "Do narodenín ostáva {days} dní. Niekto to musí oznámiť tvojim kamarátom.",
      "{days} dní do narodenín. Priprav sa na falošné nadšenie.",
    ];
    const nextBirthdayNote = pick(nextBirthdayPool, `${key}|n`);

    const famousNote = pick(notes.famous, `${key}|f`);
    const blurredTitle = pick(notes.blurredIntro, `${key}|b`);

    const toNext = daysUntilNextBirthday(birth);

    const life = approxLifeStats(alive);

    const famousText = famous ? formatFamous(famous) : null;
    const famousName = famous?.name ?? "niekto";
    const famousYear = famous?.year ? String(famous.year) : "";
    const famousPlace = famous?.place ?? "";
    const famousRole = famous?.note ?? "";

    const famousLine = famousText
      ? `${famousName}${famousRole ? ", " + famousRole : ""}${famousYear ? " (" + famousYear + ")" : ""}`
      : null;

    const famousJoke = applyTemplate(famousNote, {
      famous: famousText ?? "niekto",
      name: famousName,
      year: famousYear,
      place: famousPlace,
      note: famousRole,
    });

    const zodiacLine = applyTemplate(zodiacNote, { zodiac });
    const chineseLine = applyTemplate(chineseNote, { cz });
    const daysLine = applyTemplate(daysNote, { days: String(alive) });
    const nextLine = applyTemplate(nextBirthdayNote, { days: String(toNext) });

   // blurred: vyber 4 riadky deterministicky
const blurred = Array.from({ length: 4 }, (_, i) =>
  pick(blurredFacts, `${key}|blur|${i}`)
);

const zodiacNote = pick(notes.westernZodiac, `${key}|z`);
const chineseNote = pick(notes.chineseZodiac, `${key}|c`);
const daysNote = pick(notes.daysAlive, `${key}|d`);
const famousNote = pick(notes.famous, `${key}|f`);
const blurredTitle = pick(notes.blurredIntro, `${key}|b`);
const bdayNote = pick(notes.birthdayCountdown, `${key}|bd`);


        return {
      key,
      cleanName,
      birthISO,
      zodiac,
      cz,
      alive,
      age,
      toNext,

      // texty
      zodiacLine,
      chineseLine,
      daysLine,
      nextLine,

      famousText,
      famousLine,
      famousJoke,

      // "životné štatistiky" (cca)
      life,

      blurredTitle,
      blurred,
    };
  }, [submitted, name, birthISO]);

  const canSubmit = name.trim().length > 0 && !!parseISODate(birthISO);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 p-6 border border-neutral-800 shadow-xl">
        <h1 className="text-2xl font-semibold">Čo si o sebe určite nevedel</h1>
        <p className="text-neutral-300 mt-2 text-sm">Toto nie je test. Je to zrkadlo.</p>

        {!submitted && (
          <div className="mt-6 space-y-3">
            <input
              placeholder="Meno"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            />

            <input
              type="date"
              value={birthISO}
              onChange={(e) => setBirthISO(e.target.value)}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
            />

            <button
              onClick={() => setSubmitted(true)}
              disabled={!canSubmit}
              className="w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Vyhodnotiť
            </button>

            <p className="text-xs text-neutral-400">Tlačidlo sa odomkne, keď zadáš meno aj dátum. Aj weby majú hranice.</p>
          </div>
        )}

        {submitted && computed && "error" in computed && (
          <div className="mt-6 text-sm text-red-300">
            {computed.error}
            <div className="mt-3">
              <button onClick={() => setSubmitted(false)} className="underline">
                Späť
              </button>
            </div>
          </div>
        )}

        {submitted && computed && !("error" in computed) && (
          <div className="mt-6 space-y-5">
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Asi o sebe už vieš:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-1">
                <div>
                                    <span className="text-neutral-400">Znamenie:</span> {computed.zodiac} <span className="text-neutral-400">–</span> {computed.zodiacLine}
                </div>
                <div className="text-neutral-400">{computed.nextLine}</div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale možno netušíš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-1">
                <div>
                                    <span className="text-neutral-400">Čínske znamenie (rok):</span> {computed.cz} <span className="text-neutral-400">–</span> {computed.chineseLine}
                </div>
                <div>
                  <span className="text-neutral-400">Koľko dní si na svete (cca):</span> {computed.alive} dní
                </div>
                <div className="text-neutral-400">{computed.daysLine}</div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale určite nevieš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-1">
                <div>
                                    <span className="text-neutral-400">Dnes má narodeniny aj:</span> {computed.famousLine ?? "(žiadne dáta?)"}
                </div>
                <div className="text-neutral-400">{computed.famousJoke}</div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Čo ďalej určite nevieš:</h2>

              <div className="mt-3 space-y-2">
                {computed.blurred.map((t, i) => (
                  <div
                    key={i}
                    className="rounded bg-neutral-800/50 px-3 py-2 blur-[1.6px] select-none text-neutral-200"
                  >
                    {t}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between text-sm text-neutral-300">
                <div>
                                    <span className="text-neutral-500">Vek:</span> {computed.age} rokov · <span className="text-neutral-500">Do narodenín:</span> {computed.toNext} dní
                  <span className="text-neutral-500"> · Srdce:</span> {fmtInt(computed.life.heartbeats)}×
                  <span className="text-neutral-500"> · Mrknutia:</span> {fmtInt(computed.life.blinks)}×
                  <span className="text-neutral-500"> · Nádychy:</span> {fmtInt(computed.life.breaths)}×
                </div>
                <button onClick={() => setSubmitted(false)} className="underline">
                  Skúsiť znova
                </button>
              </div>

              <div className="mt-4">
                <button className="w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold">Pokračovať</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
