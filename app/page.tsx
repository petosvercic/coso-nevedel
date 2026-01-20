"use client";

import { useMemo, useState } from "react";
import { famousBirthdays } from "./data/famousBirthdays";

// --- helpers (držím to v jednom súbore, aby si nemusel nič hľadať) ---

function parseISODate(iso: string): Date | null {
  // očakávame "YYYY-MM-DD" (z <input type="date">)
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // validácia
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function mmdd(date: Date): string {
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${m}-${d}`;
}

function dayOfYearUTC(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function getAgeUTC(birth: Date, now = new Date()): number {
  const y = birth.getUTCFullYear();
  const m = birth.getUTCMonth();
  const d = birth.getUTCDate();

  const ny = now.getUTCFullYear();
  const nm = now.getUTCMonth();
  const nd = now.getUTCDate();

  let age = ny - y;
  if (nm < m || (nm === m && nd < d)) age -= 1;
  return age;
}

function daysAliveUTC(birth: Date, now = new Date()): number {
  const b = Date.UTC(birth.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  const n = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((n - b) / 86400000));
}

function daysUntilNextBirthdayUTC(birth: Date, now = new Date()): number {
  const ny = now.getUTCFullYear();
  const bm = birth.getUTCMonth();
  const bd = birth.getUTCDate();

  let next = new Date(Date.UTC(ny, bm, bd));
  const today = new Date(Date.UTC(ny, now.getUTCMonth(), now.getUTCDate()));

  if (next.getTime() < today.getTime()) {
    next = new Date(Date.UTC(ny + 1, bm, bd));
  }

  return Math.floor((next.getTime() - today.getTime()) / 86400000);
}

function westernZodiacUTC(date: Date): string {
  // hranice sú klasické; používame UTC
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();

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

function chineseZodiac(year: number): string {
  // 12-ročný cyklus, referenčný rok 2008 = Potkan
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
  const idx = ((year - 2008) % 12 + 12) % 12;
  return animals[idx];
}

function nameStats(name: string) {
  const trimmed = name.trim();
  const noSpaces = trimmed.replace(/\s+/g, "");
  const letters = noSpaces.length;
  const vowels = (noSpaces.match(/[aeiouyáäéíóôöúýàèìòùâêîôû]/gi) || []).length;
  const consonants = Math.max(0, letters - vowels);
  return { trimmed, letters, vowels, consonants };
}

function pickFamous(mmddKey: string): string | null {
  const list = famousBirthdays[mmddKey];
  if (!list || list.length === 0) return null;
  // deterministicky „náhodné“: vezmeme index podľa súčtu číslic v kľúči
  const seed = mmddKey
    .replace("-", "")
    .split("")
    .reduce((a, c) => a + Number(c || 0), 0);
  const idx = seed % list.length;
  const entry = list[idx];
  if (typeof entry === "string") return entry;
  return entry.note ? `${entry.name} (${entry.note})` : entry.name;
}

export default function Home() {
  const [name, setName] = useState("");
  const [birthISO, setBirthISO] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const computed = useMemo(() => {
    const birth = parseISODate(birthISO);
    if (!birth) return null;

    const stats = nameStats(name);
    const zodiac = westernZodiacUTC(birth);
    const chinese = chineseZodiac(birth.getUTCFullYear());
    const doy = dayOfYearUTC(birth);
    const age = getAgeUTC(birth);
    const alive = daysAliveUTC(birth);
    const nextBday = daysUntilNextBirthdayUTC(birth);
    const key = mmdd(birth);
    const famous = pickFamous(key);

    // „crazy“ drobnosti, ale stále bezpečné a deterministické
    const heartbeat = alive * 100000; // ~100k úderov denne (hrubý odhad)
    const blinks = alive * 20000; // ~20k žmurknutí denne

    return {
      birth,
      key,
      stats,
      zodiac,
      chinese,
      doy,
      age,
      alive,
      nextBday,
      famous,
      heartbeat,
      blinks,
    };
  }, [birthISO, name]);

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

            <p className="text-xs text-neutral-400">
              Tlačidlo sa odomkne, keď zadáš meno aj dátum. Áno, aj weby majú hranice.
            </p>
          </div>
        )}

        {submitted && computed && (
          <div className="mt-6 space-y-5">
            {/* 1 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Asi o sebe už vieš:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-1">
                <div>
                  <span className="text-neutral-400">Znamenie:</span> {computed.zodiac}
                </div>
                <div>
                  <span className="text-neutral-400">Dĺžka mena (bez medzier):</span> {computed.stats.letters} znakov
                </div>
              </div>
            </section>

            {/* 2 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale možno netušíš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-1">
                <div>
                  <span className="text-neutral-400">Čínske znamenie (rok):</span> {computed.chinese}
                </div>
                <div>
                  <span className="text-neutral-400">Koľko dní si na svete (cca):</span> {computed.alive} dní
                </div>
              </div>
            </section>

            {/* 3 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale určite nevieš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-1">
                <div>
                  <span className="text-neutral-400">V ten deň sa narodili aj:</span>{" "}
                  {computed.famous ?? "(zatIAľ nemám v databáze tvoj dátum, doplníme)"}
                </div>
              </div>
            </section>

            {/* Rozmazané riadky */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Čo dalej určite nevieš:</h2>
              <div className="mt-3 space-y-2">
                <div className="h-3 rounded bg-neutral-800/60 blur-[1.5px]" />
                <div className="h-3 rounded bg-neutral-800/60 blur-[1.5px] w-11/12" />
                <div className="h-3 rounded bg-neutral-800/60 blur-[1.5px] w-10/12" />
                <div className="h-3 rounded bg-neutral-800/60 blur-[1.5px] w-9/12" />
              </div>

              <div className="mt-4 text-xs text-neutral-400">
                Malý teaser: podľa hrubého odhadu už tvoje srdce spravilo asi {computed.heartbeat.toLocaleString()} úderov
                a oči žmurkli okolo {computed.blinks.toLocaleString()} krát. Máš sa čím chváliť na party.
              </div>
            </section>

            <div className="flex items-center justify-between text-sm text-neutral-300">
              <div>
                <span className="text-neutral-500">Vek:</span> {computed.age} rokov ·{" "}
                <span className="text-neutral-500">Do narodenín:</span> {computed.nextBday} dní
              </div>
              <button onClick={() => setSubmitted(false)} className="underline">
                Skúsiť znova
              </button>
            </div>
          </div>
        )}

        {submitted && !computed && (
          <div className="mt-6 text-sm text-red-300">
            Niečo je zle s dátumom. Skús ho zadať cez ten kalendárik (input type=date).
            <div className="mt-3">
              <button onClick={() => setSubmitted(false)} className="underline">
                Späť
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
