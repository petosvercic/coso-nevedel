"use client";

import { useEffect, useMemo, useState } from "react";
import { analogies } from "./data/analogies";
import { notes } from "./data/notes";
import { paywallCopy } from "./data/paywallCopy";
import { unknownItems } from "./data/unknownList";
import { buildFactBlocks } from "./lib/factLogic";

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

function zodiacVibe(z: string, seed: string) {
  // toto musí byť ľudská veta. Aj keď notes ešte nie sú upravené,
  // tu to "obalíme", aby nevzniklo "Vodnár: Vodnár..."
  const raw = pick(notes.westernZodiac, `${seed}|west|${z}`);
  const cleaned = raw.replace(/^(\s*\{zodiac\}\s*:\s*)/i, "").replace(/^\s*[^:]{2,20}:\s*/, "");
  return `Narodil si sa v znamení ${z}. ${cleaned}`;
}

function birthdayCountdownLine(toNext: number, seed: string) {
  const variants = [
    `{n} dní do narodenín. Zvláštne, ako rýchlo sa z “raz” stane “už zase”.`,
    `{n} dní do narodenín. Čas beží. Ty sa tváriš, že nie.`,
    `{n} dní do narodenín. Ešte dosť času na plán. Aj na výhovorky.`,
    `{n} dní do narodenín. Je to bližšie, než si pripúšťaš.`,
  ];
  return pick(variants, seed).replace("{n}", String(toNext));
}

function analogyLine(days: number, seed: string) {
  const a = pick(analogies, seed);
  return a.text.replace("{days}", String(days));
}

function chineseZodiacLine(cz: string, year: number, seed: string) {
  // ak máš v notes rozdelené podľa zvieraťa, použijeme. Inak fallback.
  const dict = (notes as any).chineseZodiacByAnimal as Record<string, readonly string[]> | undefined;
  const list = dict?.[cz];
  const base = list?.length
    ? pick(list, `${seed}|cz|${cz}`)
    : `Ľudia v tebe vidia mäkkosť. Nevidia, koľko energie stojí byť takýto človek.`;

  // obalíme do ľudskej vety (tvoj požadovaný tvar)
  return `V čínskom znamení si sa narodil v roku ${cz} (${year}). ${base}`;
}

/**
 * PAYWALL TEASER:
 * - pred zaplatením ukážeme všetky tasky
 * - ale len 1 odpoveď na sekciu je "odhalená", ostatné sú blur/placeholder
 */
function shouldRevealRow(resultId: string, section: string, rowId: string): boolean {
  // deterministicky: 1 odhalená vec na sekciu
  const h = hashString(`${resultId}|reveal|${section}|${rowId}`);
  // cca 18% šanca, ale neskôr to ešte "zoškrtíme" per section
  return (h % 100) < 18;
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

    const vibe = zodiacVibe(zodiac, `${key}|${cleanName}`);
    const bdayLine = birthdayCountdownLine(toNext, `${key}|bd|${cleanName}`);
    const aliveLine = analogyLine(alive, `${key}|alive|${cleanName}`);

    const czLine = chineseZodiacLine(cz, birth.getFullYear(), `${key}|cz|${cleanName}`);

    const factBlocks = buildFactBlocks({
      name: cleanName,
      dobISO: birthISO,
      rid: resultId,
      daysAlive: alive,
    });

    const postPaidFooter = pick(paywallCopy.postPaidFooterPool, `${resultId}|postpaidfooter`);

    // necháme list "unknownItems" ako teaser po taskoch (bez tých spodných sumárov)
    const teaserTitles = unknownItems.map((u) => u.title);

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
      factBlocks,
      teaserTitles,
      postPaidFooter,
    };
  }, [submitted, name, birthISO]);

  const canSubmit = name.trim().length > 0 && !!parseISODate(birthISO);

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
                <div className="text-neutral-300">{computed.vibe}</div>
                <div className="text-neutral-300">{computed.bdayLine}</div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ale možno netušíš že:</h2>
              <div className="mt-2 text-sm text-neutral-200 space-y-2">
                <div className="text-neutral-300">{computed.czLine}</div>
                <div className="text-neutral-300">Na svete si približne {computed.alive} dní.</div>
                <div className="text-neutral-300">{computed.aliveLine}</div>
              </div>
            </section>

            {/* ✅ HLAVNÁ SEKCIa: TASKY (vždy všetky), odpovede len niektoré pred paywallom */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <h2 className="font-semibold">Ďalšie čísla sú len odhady. Zvláštne je, ako často sedia:</h2>

              <div className="mt-4 space-y-6">
                {computed.factBlocks.map((block) => {
                  // pred paywallom: odhalíme max 1 riadok na sekciu
                  let revealedCount = 0;

                  return (
                    <div key={block.section}>
                      <div className="text-neutral-400 text-sm mb-2">{block.heading}</div>

                      <div className="space-y-2">
                        {block.rows.map((row) => {
                          const canReveal =
                            isPaid ||
                            (() => {
                              if (revealedCount >= 1) return false;
                              const ok = shouldRevealRow(computed.resultId, block.section, row.id);
                              if (ok) revealedCount++;
                              return ok;
                            })();

                          const valueText = isPaid
                            ? row.value
                            : canReveal
                              ? row.value
                              : "— — —";

                          const noteText = isPaid
                            ? row.note
                            : canReveal
                              ? row.note
                              : "Odomkne sa po pokračovaní.";

                          return (
                            <div
                              key={row.id}
                              className="rounded bg-neutral-950/50 border border-neutral-800 px-3 py-2 text-neutral-200 text-sm"
                            >
                              <div className="text-neutral-300">{row.title}</div>

                              <div
                                className={
                                  isPaid
                                    ? "text-neutral-100 font-semibold mt-1"
                                    : canReveal
                                      ? "text-neutral-100 font-semibold mt-1"
                                      : "text-neutral-100 font-semibold mt-1 blur-[1.8px] select-none"
                                }
                              >
                                {valueText}
                              </div>

                              {noteText && (
                                <div
                                  className={
                                    isPaid
                                      ? "text-neutral-400 mt-1"
                                      : canReveal
                                        ? "text-neutral-400 mt-1"
                                        : "text-neutral-400 mt-1 blur-[1.6px] select-none"
                                  }
                                >
                                  {noteText}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* teaser "čo ešte" - iba názvy, nič viac */}
              {!isPaid && (
                <div className="mt-6">
                  <div className="text-neutral-400 text-sm mb-2">A ešte pár vecí, ktoré si bežne uvedomíš až spätne:</div>
                  <ul className="list-disc list-inside text-sm text-neutral-200 space-y-1">
                    {computed.teaserTitles.slice(0, 10).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

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
                  <div className="text-xs text-neutral-400 mt-2">Odomkne sa všetko. Bez nových otázok. Len bez závoja.</div>
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

            <button
              className="mt-3 w-full rounded-xl bg-neutral-100 text-neutral-950 py-2 font-semibold"
              onClick={() => startCheckout(computed.resultId)}
            >
              {paywallCopy.fastPayBtn}
            </button>
            <div className="text-xs text-neutral-400 mt-2">{paywallCopy.fastPayNote}</div>

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
