"use client";

import { useMemo, useState } from "react";

import famousBirthdaysRaw from "./data/famousBirthdays.json";
import { analogies } from "./data/analogies";
import { unknownItems } from "./data/unknownList";

type FamousEntry = {
  name: string;
  year?: number;
  place?: string | null;
  note?: string;
  what?: string | null;
};

const famousBirthdays = famousBirthdaysRaw as unknown as Record<string, FamousEntry[]>;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function mmdd(date: Date) {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISODate(iso: string): Date | null {
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
  const animals = ["Potkan", "Byvol", "Tiger", "Zajac", "Drak", "Had", "Kôň", "Koza", "Opica", "Kohút", "Pes", "Prasa"];
  // 2008 = Potkan
  const idx = ((year - 2008) % 12 + 12) % 12;
  return animals[idx];
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: string) {
  const idx = hashString(seed) % arr.length;
  return arr[idx];
}

function formatNumber(n: number) {
  // 1234567 -> "1 234 567"
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function zodiacVibe(z: string) {
  // krátke “vodnar - vodcovsky typ” veci
  const map: Record<string, string[]> = {
    Vodnár: ["Vodnár = hlava v oblakoch, nohy v realite. Občas naopak.", "Vodnár: originál, ktorý sa tvári, že mu na tom nezáleží."],
    Ryby: ["Ryby: empatia na plné pecky. Aj keď sa tváriš, že nie.", "Ryby: vieš vycítiť náladu miestnosti skôr, než si sadneš."],
    Baran: ["Baran: keď chceš, ideš. Keď nechceš, aj tak ideš.", "Baran: impulz je tvoja obľúbená forma plánovania."],
    Býk: ["Býk: trpezlivosť… až kým nie.", "Býk: stabilita, pohodlie, a potom tvrdohlavosť ako bonus."],
    Blíženci: ["Blíženci: dve myšlienky naraz, minimum nudy.", "Blíženci: komunikácia je šport. Niekedy kontaktný."],
    Rak: ["Rak: lojalita je tvoja superschopnosť.", "Rak: pamätáš si veci, ktoré iní už dávno vytesnili."],
    Lev: ["Lev: charisma, ktoré sa tvári nenápadne. Neúspešne.", "Lev: keď svietiš, miestnosť si to všimne."],
    Panna: ["Panna: detail je náboženstvo.", "Panna: poriadok v chaosu… alebo aspoň pokus."],
    Váhy: ["Váhy: hľadáš rovnováhu, aj keď si ju musíš vymyslieť.", "Váhy: diplomacia. A občas tiché súdy v hlave."],
    Škorpión: ["Škorpión: intuícia, ktorá občas desí aj teba.", "Škorpión: ideš do hĺbky, aj keď je tam tma."],
    Strelec: ["Strelec: sloboda je tvoj default.", "Strelec: zvedavosť ťa dostane ďaleko. Aj do problémov."],
    Kozorožec: ["Kozorožec: disciplína, čo vyzerá ako chlad.", "Kozorožec: cieľ je cieľ. Aj keď to trvá."],
  };
  const list = map[z] ?? ["Znamenie je len štítok. Ty si komplikovanejší."];
  return pick(list, `z|${z}`);
}

function birthdayCountdownLine(toNext: number, seed: string) {
  const variants = [
    `{n} dní do narodenín. Už len zistiť, kto to s tebou pôjde osláviť.`,
    `{n} dní do narodenín. Čas beží. Ty sa tváriš, že nie.`,
    `{n} dní do narodenín. Zvláštne, ako rýchlo sa z “raz” stane “už zase”.`,
    `{n} dní do narodenín. Možno tento rok naozaj niečo spravíš… možno.`,
    `{n} dní do narodenín. Ešte dosť času na plán. Aj na výhovorky.`,
  ];
  const t = pick(variants, seed);
  return t.replace("{n}", String(toNext));
}

function analogyLine(days: number, seed: string) {
  const a = pick(analogies, seed);
  return a.text.replace("{days}", String(days));
}

function formatFamous(e: FamousEntry) {
  const year = typeof e.year === "number" ? ` (${e.year})` : "";
  const place = e.place ? ` – ${e.place}` : "";
  const extra = e.what ? ` · ${e.what}` : e.note ? ` · ${e.note}` : "";
  return `${e.name}${year}${place}${extra}`;
}


function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function calcUnknownNumbers(days: number, age: number, seed: string) {
  // nie “vedecké”, ale “pravdivé na pocit”
  const seedN = hashString(seed);

  // dýchanie: ~12-18 / min
  const breathsPerMin = 12 + (seedN % 7); // 12..18
  const breaths = days * 24 * 60 * breathsPerMin;

  // srdce: ~60-95 / min
  const bpm = 60 + ((seedN >>> 3) % 36); // 60..95
  const heart = days * 24 * 60 * bpm;

  // žmurkanie: ~10-20 / min keď si hore, ~16h/deň
  const blinksPerMin = 10 + ((seedN >>> 6) % 11); // 10..20
  const blinks = days * 16 * 60 * blinksPerMin;

  // “rozhodnutia”: hrubý pocit, nie fakt (200..2500 denne)
  const decisionsPerDay = 200 + ((seedN >>> 9) % 2301);
  const decisions = days * decisionsPerDay;

  // “ovplyvnení ľudia”: mierka (desiatky až tisíce) podľa veku
  const base = 30 + age * 25;
  const jitter = (seedN >>> 12) % 400;
  const influenced = clamp(base + jitter, 30, 2500);

  return { breaths, heart, blinks, decisions, influenced };
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
    const zodiac = westernZodiac(birth);
    const cz = chineseZodiac(birth.getFullYear());

    const alive = daysAlive(birth);
    const age = getAge(birth);
    const toNext = daysUntilNextBirthday(birth);

    const vibe = zodiacVibe(zodiac);
    const bdayLine = birthdayCountdownLine(toNext, `${key}|bd|${cleanName}`);
    const aliveLine = analogyLine(alive, `${key}|alive|${cleanName}`);

    const list = famousBirthdays[key] ?? [];
    const famous = list.length ? list[hashString(`${key}|${cleanName}`) % list.length] : null;

    // “čo ďalej určite nevieš”:
    // titles viditeľne, čísla + pointy rozmazane.
    const nums = calcUnknownNumbers(alive, age, `${key}|unknown|${cleanName}`);

    const unknown = unknownItems.map((it) => {
      let nStr = "???";
      const lowTitle = it.title.toLowerCase();

      if (lowTitle.includes("nadýchol")) nStr = formatNumber(nums.breaths);
      else if (lowTitle.includes("srdce")) nStr = formatNumber(nums.heart);
      else if (lowTitle.includes("žmur")) nStr = formatNumber(nums.blinks);
      else if (lowTitle.includes("rozhod")) nStr = formatNumber(nums.decisions);
      else if (lowTitle.includes("ovplyv")) nStr = formatNumber(nums.influenced);

      return {
        title: it.title,
        blurredHint: it.blurredHint.replace("{n}", nStr),
      };
    });

    return {
      cleanName,
      birthISO,
      key,
      zodiac,
      cz,
      alive,
      age,
      toNext,
      vibe,
      bdayLine,
      aliveLine,
      famousText: famous ? formatFamous(famous) : null,
      unknown,
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

            <p className="text-xs text-neutral-400">
              Tlačidlo sa odomkne, keď zadáš meno aj dátum. Aj weby majú hranice.
            </p>
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
            {/* 1 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Asi o sebe už vieš:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div>
                  <span className="text-neutral-400">{computed.zodiac}</span> · {computed.vibe}
                </div>
                <div className="text-neutral-300">{computed.bdayLine}</div>
              </div>
            </section>

            {/* 2 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale možno netušíš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div>
                  Čínske znamenie (rok): <span className="text-neutral-300">{computed.cz}</span>
                </div>
                <div>
                  Na svete si približne <span className="text-neutral-300">{computed.alive}</span> dní.
                </div>
                <div className="text-neutral-300">{computed.aliveLine}</div>
              </div>
            </section>

            {/* 3 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale určite nevieš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div>
                  V ten deň sa narodili aj:{" "}
                  <span className="text-neutral-300">
                    {computed.famousText ?? "(zatiaľ nič extra, ale databáza je tam)"}
                  </span>
                </div>
                {/* žiadne duplicitné “vodnár vodnár” a žiadne cringe */}
                <div className="text-neutral-400">
                  Toto je len návnada. Skutočný jackpot je o pár riadkov nižšie.
                </div>
              </div>
            </section>

            {/* 4 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Čo ďalej určite nevieš:</h2>

              {/* Viditeľné bullet body */}
              <ul className="mt-3 list-disc list-inside text-sm text-neutral-200 space-y-1">
                {computed.unknown.map((u, i) => (
                  <li key={i}>{u.title}</li>
                ))}
              </ul>

              {/* Rozmazané čísla + pointy */}
              <div className="mt-4 space-y-2">
                {computed.unknown.map((u, i) => (
                  <div
                    key={i}
                    className="rounded bg-neutral-800/50 px-3 py-2 blur-[1.8px] select-none text-neutral-200 text-sm"
                    title="odblokuje sa po zaplatení"
                  >
                    {u.blurredHint}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between text-sm text-neutral-300">
                <div>
                  <span className="text-neutral-500">Vek:</span> {computed.age} rokov ·{" "}
                  <span className="text-neutral-500">Do narodenín:</span> {computed.toNext} dní
                </div>
                <button onClick={() => setSubmitted(false)} className="underline">
                  Skúsiť znova
                </button>
              </div>

              <div className="mt-4">
                <button className="w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold">
                  Pokračovať
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
