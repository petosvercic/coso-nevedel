"use client";

import { useEffect, useMemo, useState } from "react";
import famousBirthdaysRaw from "./data/famousBirthdays.json";
import { analogies } from "./data/analogies";
import { unknownItems } from "./data/unknownList";
import { notes } from "./data/notes";
import { paywallCopy } from "./data/paywallCopy";

import { buildFactBlocks } from "./lib/factLogic";

type FamousEntry = { name: string; year?: number; note?: string };
const famousBirthdays = famousBirthdaysRaw as unknown as Record<string, FamousEntry[]>;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function mmdd(date: Date) {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function parseISODate(iso: string): Date | null {
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
function makeResultId(name: string, birthISO: string) {
  return String(hashString(`${name.trim().toLowerCase()}|${birthISO}`));
}

function zodiacVibeFromNotes(z: string, seed: string) {
  // preferuj nový pool v notes.westernZodiac
  const line = pick(notes.westernZodiac, `${seed}|west|${z}`);
  return line.replace("{zodiac}", z);
}

function birthdayCountdownLine(toNext: number, seed: string) {
  const variants = [
    `{n} dní do narodenín. Už len zistiť, kto to s tebou pôjde osláviť.`,
    `{n} dní do narodenín. Čas beží. Ty sa tváriš, že nie.`,
    `{n} dní do narodenín. Zvláštne, ako rýchlo sa z “raz” stane “už zase”.`,
    `{n} dní do narodenín. Ešte dosť času na plán. Aj na výhovorky.`,
  ];
  return pick(variants, seed).replace("{n}", String(toNext));
}

function analogyLine(days: number, seed: string) {
  const a = pick(analogies, seed);
  return a.text.replace("{days}", String(days));
}

function chineseZodiacLine(cz: string, seed: string) {
  const dict = (notes as any).chineseZodiacByAnimal as Record<string, readonly string[]> | undefined;
  const list = dict?.[cz];
  const line = list?.length ? pick(list, `${seed}|cz|${cz}`) : `${cz}: (popis sa niekde stratil, čo je tiež istý typ osudu).`;
  return line;
}

const LS_LAST = "coso:lastInput:v1";
const LS_PAID_RID = "coso:paidRid:v1";

export default function Home() {
  const [name, setName] = useState("");
  const [birthISO, setBirthISO] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // 1) pri štarte obnovíme posledný vstup (aby po Stripe návrate nebolo prázdno)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LAST);
      if (!raw) return;
      const obj = JSON.parse(raw) as { name?: string; birthISO?: string; submitted?: boolean };
      if (typeof obj.name === "string") setName(obj.name);
      if (typeof obj.birthISO === "string") setBirthISO(obj.birthISO);
      if (obj.submitted) setSubmitted(true);
    } catch {}
  }, []);

  // 2) vždy keď sa mení vstup/submitted, uložíme ho (persist)
  useEffect(() => {
    try {
      localStorage.setItem(LS_LAST, JSON.stringify({ name, birthISO, submitted }));
    } catch {}
  }, [name, birthISO, submitted]);

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

    const resultId = makeResultId(cleanName, birthISO);

    const vibe = zodiacVibeFromNotes(zodiac, `${key}|${cleanName}`);
    const bdayLine = birthdayCountdownLine(toNext, `${key}|bd|${cleanName}`);
    const aliveLine = analogyLine(alive, `${key}|alive|${cleanName}`);

    const list = famousBirthdays[key] ?? [];
    const famous = list.length ? list[hashString(`${key}|${cleanName}`) % list.length] : null;

    const czLine = chineseZodiacLine(cz, `${key}|cz|${cleanName}`);
    const curLine = pick(notes.famous, `${key}|cur|${cleanName}`);

    // ✅ NOVÉ: “blbosti” fakty (deterministické, profilové)
    const factBlocks = buildFactBlocks({
      name: cleanName,
      dobISO: birthISO,
      rid: resultId,
      daysAlive: alive,
    });

    // Paywall blur list (stále zachováme)
    const blurredUnknown = unknownItems.map((it, idx) => {
      // len aby bolo čo blur-núť, dáme pseudo-n pre každý item
      const n = (hashString(`${resultId}|u|${idx}`) % 900) + 40;
      return { title: it.title, fullText: it.blurredHint.replace("{n}", String(n)) };
    });

    const postPaidFooter = pick(paywallCopy.postPaidFooterPool, `${resultId}|postpaidfooter`);

    return {
      cleanName,
      birthISO,
      resultId,
      zodiac,
      cz,
      alive,
      age,
      toNext,
      vibe,
      bdayLine,
      aliveLine,
      czLine,
      famousName: famous ? `${famous.name}${typeof famous.year === "number" ? ` (${famous.year})` : ""}` : null,
      curLine,
      factBlocks,
      blurredUnknown,
      postPaidFooter,
    };
  }, [submitted, name, birthISO]);

  const canSubmit = name.trim().length > 0 && !!parseISODate(birthISO);

  // 3) Základná logika odomykania: odomkne sa iba vtedy, ak "zaplatené rid" sa rovná aktuálnemu výsledku
  useEffect(() => {
    if (!submitted) return;
    if (!computed || "error" in computed) return;

    try {
      const paidRid = localStorage.getItem(LS_PAID_RID);
      setIsPaid(paidRid === computed.resultId);
    } catch {
      setIsPaid(false);
    }
  }, [submitted, computed?.resultId]);

  // 4) návrat zo Stripe + overenie platby (a uloženie presného resultId, ktorý bol zaplatený)
  useEffect(() => {
    if (!submitted) return;
    if (!computed || "error" in computed) return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) return;

    setVerifying(true);
    fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.paid) {
          const paidResultId = typeof data?.resultId === "string" ? data.resultId : computed.resultId;
          try {
            localStorage.setItem(LS_PAID_RID, paidResultId);
          } catch {}
          setIsPaid(paidResultId === computed.resultId);
          setPaywallOpen(false);
        }

        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        url.searchParams.delete("rid");
        window.history.replaceState({}, "", url.toString());
      })
      .finally(() => setVerifying(false));
  }, [submitted, computed]);

  async function startCheckout(resultId: string) {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resultId }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }

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
              <button
                onClick={() => {
                  setSubmitted(false);
                  setPaywallOpen(false);
                  setIsPaid(false);
                }}
                className="underline"
              >
                Späť
              </button>
            </div>
          </div>
        )}

        {submitted && computed && !("error" in computed) && (
          <div className="mt-6 space-y-5">
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Asi o sebe už vieš:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div>
                  <span className="text-neutral-400">{computed.zodiac}</span> · {computed.vibe}
                </div>
                <div className="text-neutral-300">{computed.bdayLine}</div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale možno netušíš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div>
                  Čínske znamenie (rok): <span className="text-neutral-300">{computed.cz}</span>
                </div>
                <div className="text-neutral-300">{computed.czLine}</div>
                <div>
                  Na svete si približne <span className="text-neutral-300">{computed.alive}</span> dní.
                </div>
                <div className="text-neutral-300">{computed.aliveLine}</div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale určite nevieš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div>
                  Kuriozita dňa:{" "}
                  <span className="text-neutral-300">{computed.famousName ?? "(dnes nič extra, ale aj to je výpoveď)"}</span>
                </div>
                <div className="text-neutral-400">{computed.curLine}</div>
              </div>
            </section>

            {/* ✅ NOVÁ SEKCIa: FACT BLOCKS */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">{pick(notes.blurredIntro, `${computed.resultId}|intro`)}</h2>

              <div className="mt-4 space-y-5">
                {computed.factBlocks.map((block) => (
                  <div key={block.section}>
                    <div className="text-neutral-400 text-sm mb-2">{block.heading}</div>
                    <div className="space-y-2">
                      {block.rows.map((row) => (
                        <div
                          key={row.id}
                          className={
                            isPaid
                              ? "rounded bg-neutral-950/50 border border-neutral-800 px-3 py-2 text-neutral-200 text-sm"
                              : "rounded bg-neutral-800/50 px-3 py-2 blur-[1.8px] select-none text-neutral-200 text-sm"
                          }
                          title={isPaid ? "" : "odblokuje sa po zaplatení"}
                        >
                          <div className="text-neutral-300">{row.title}</div>
                          <div className="text-neutral-100 font-semibold">{row.value}</div>
                          {row.note && <div className="text-neutral-400">{row.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* STARÝ paywall list necháme ako “teaser” */}
              <ul className="mt-6 list-disc list-inside text-sm text-neutral-200 space-y-1">
                {computed.blurredUnknown.map((u, i) => (
                  <li key={i}>{u.title}</li>
                ))}
              </ul>

              <div className="mt-4 space-y-2">
                {computed.blurredUnknown.map((u, i) => (
                  <div
                    key={i}
                    className={
                      isPaid
                        ? "rounded bg-neutral-950/50 border border-neutral-800 px-3 py-2 text-neutral-200 text-sm"
                        : "rounded bg-neutral-800/50 px-3 py-2 blur-[1.8px] select-none text-neutral-200 text-sm"
                    }
                    title={isPaid ? "" : "odblokuje sa po zaplatení"}
                  >
                    {u.fullText}
                  </div>
                ))}
              </div>

              {isPaid && (
                <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-lg font-semibold">{paywallCopy.postPaidTitle}</div>
                  <div className="mt-2 text-sm text-neutral-200 space-y-1">
                    {paywallCopy.postPaidIntro.map((l, i) => (
                      <div key={i} className="text-neutral-300">
                        {l}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                    <div className="text-neutral-200 font-semibold">Certifikát výsledku</div>
                    <div className="text-neutral-400 text-sm mt-1">
                      Tento výsledok vznikol z tvojho mena a dátumu. Môžeš si ho uložiť alebo zdieľať.
                    </div>
                    <div className="text-neutral-500 text-xs mt-2">ID: {computed.resultId}</div>

                    <button
                      className="mt-3 w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold"
                      onClick={() => {
                        const url = window.location.href.split("?")[0] + `?rid=${encodeURIComponent(computed.resultId)}`;
                        navigator.clipboard?.writeText(url);
                        alert("Link na zdieľanie skopírovaný.");
                      }}
                    >
                      Zdieľať výsledok
                    </button>
                    <div className="text-neutral-500 text-xs mt-2">Nie každý to pochopí. A to je v poriadku.</div>
                  </div>

                  <div className="mt-4 text-neutral-300 italic">{computed.postPaidFooter}</div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between text-sm text-neutral-300">
                <div>
                  <span className="text-neutral-500">Vek:</span> {computed.age} rokov ·{" "}
                  <span className="text-neutral-500">Do narodenín:</span> {computed.toNext} dní
                </div>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setPaywallOpen(false);
                    setIsPaid(false);
                  }}
                  className="underline"
                >
                  Skúsiť znova
                </button>
              </div>

              {!isPaid && (
                <div className="mt-4">
                  <button
                    className="w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold"
                    onClick={() => setPaywallOpen(true)}
                  >
                    Pokračovať
                  </button>
                  <div className="text-xs text-neutral-400 mt-2">Zvyšok je presnejší. Aj trochu nepríjemnejší.</div>
                </div>
              )}

              {verifying && <div className="mt-3 text-xs text-neutral-400">Overujem platbu…</div>}
            </section>
          </div>
        )}
      </div>

      {/* PAYWALL MODAL */}
      {paywallOpen && computed && !("error" in computed) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <div className="text-xl font-semibold">{paywallCopy.title}</div>

            <div className="mt-3 text-sm text-neutral-200 space-y-1">
              {paywallCopy.intro.map((l, i) => (
                <div key={i} className="text-neutral-300">
                  {l}
                </div>
              ))}
            </div>

            <div className="mt-4 text-sm text-neutral-200">
              <div className="font-semibold text-neutral-200">{paywallCopy.unlockTitle}</div>
              <ul className="mt-2 list-disc list-inside space-y-1 text-neutral-300">
                {paywallCopy.unlockBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 text-sm text-neutral-200">
              <div className="font-semibold text-neutral-200">{paywallCopy.sharingTitle}</div>
              <div className="mt-2 space-y-1 text-neutral-300">
                {paywallCopy.sharingText.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>

            <div className="mt-5 text-sm text-neutral-200 font-semibold">{paywallCopy.howToContinue}</div>

            <button className="mt-3 w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold" onClick={() => startCheckout(computed.resultId)}>
              {paywallCopy.fastPayBtn}
            </button>
            <div className="text-xs text-neutral-400 mt-2">{paywallCopy.fastPayNote}</div>

            <button
              className="mt-4 w-full rounded-xl bg-neutral-800 text-neutral-200 py-2 font-semibold opacity-60 cursor-not-allowed"
              disabled
              title="MVP: pridáme po prvých dátach (SK/CZ)"
            >
              {paywallCopy.smsBtn}
            </button>
            <div className="text-xs text-neutral-400 mt-2">{paywallCopy.smsNote}</div>

            <div className="mt-5 text-sm text-neutral-300">{paywallCopy.priceLine}</div>
            <div className="mt-2 text-sm text-neutral-400 italic">{paywallCopy.closing}</div>

            <div className="mt-5 flex gap-3">
              <button className="w-full rounded-xl border border-neutral-800 py-2 text-neutral-200" onClick={() => setPaywallOpen(false)}>
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
