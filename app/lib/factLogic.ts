// app/lib/factLogic.ts

import type { RNG } from "@/app/lib/seed";
import { makeRng } from "@/app/lib/seed";
import { buildProfile, type Profile } from "@/app/lib/profile";
import { clamp, intBetween, pickManyUnique, randomNormalish, formatInt } from "@/app/lib/pick";
import { factTitles, type FactSectionKey, type FactTitle } from "@/app/data/factTitles";

export type FactValueKind = "percent" | "count" | "range";

export type FactRow = {
  id: string;
  title: string;
  kind: FactValueKind;
  value: string;        // už vyplnené (napr. "62 %" alebo "18 400+" alebo "120–480")
  note?: string;        // krátky dozvuk
  section: FactSectionKey;
};

export type FactBlock = {
  section: FactSectionKey;
  heading: string;
  rows: FactRow[];
};

const SECTION_HEADINGS: Record<FactSectionKey, string> = {
  mind: "Hlava",
  body: "Telo",
  social: "Ľudia",
  time: "Čas",
  name: "Meno",
  meta: "Vzorce",
  weird: "Divné veci",
};

const NOTES_GENERIC = [
  "Odhad, nie rozsudok.",
  "Nie je to presné. Ale vie to trafiť smer.",
  "Nie je dôležité číslo. Dôležité je, že sa to opakuje.",
  "Znie to náhodne, kým si to nezačneš všímať.",
  "Nie je to výčitka. Je to stopa.",
] as const;

function note(rng: RNG): string {
  return NOTES_GENERIC[Math.floor(rng() * NOTES_GENERIC.length)];
}

/**
 * Vyberie, koľko faktov z ktorej sekcie dáš do free časti.
 * Môžeš to upraviť podľa UI, ale default je: 2–3 sekcie, každá 2–3 riadky.
 */
function chooseSections(rng: RNG, profile: Profile): FactSectionKey[] {
  // základ: vždy niečo “ľudské” (social/time) + niečo “vnútorné” (mind/meta)
  const core: FactSectionKey[] = ["social", "time"];

  const extraPool: FactSectionKey[] = ["mind", "name", "meta", "body", "weird"];

  // viac chaos/intensity -> pridaj weird/meta; viac control -> pridaj name/body
  const wantsWeird = profile.chaos + profile.intensity > 1.1;
  const wantsBody = profile.control > 0.62 && profile.openness < 0.58;

  let extras: FactSectionKey[] = [];

  if (wantsWeird) extras.push("weird", "meta");
  if (wantsBody) extras.push("body", "name");

  // doplň ešte 1 sekciu náhodne (deterministicky)
  const fallbackPick = extraPool[Math.floor(rng() * extraPool.length)];
  extras.push(fallbackPick);

  // unikátne + limit
  const all = [...new Set([...core, ...extras])];
  return all.slice(0, 4); // max 4 sekcie v jednom výsledku, aby to nebolo nekonečné
}

function pickTitlesForSection(rng: RNG, section: FactSectionKey, count: number): FactTitle[] {
  const pool = factTitles[section];
  return pickManyUnique(rng, pool, count);
}

/**
 * Rozhodne, aký typ čísla má daný title: percent/count/range
 * Heuristika podľa sekcie a trochu profilu, aby to pôsobilo konzistentne.
 */
function decideKind(rng: RNG, section: FactSectionKey, profile: Profile): FactValueKind {
  const t = rng();

  if (section === "time") return t < 0.45 ? "percent" : (t < 0.75 ? "count" : "range");
  if (section === "social") return t < 0.55 ? "count" : "range";
  if (section === "mind") return t < 0.60 ? "percent" : "count";
  if (section === "body") return t < 0.50 ? "count" : "percent";
  if (section === "name") return t < 0.40 ? "range" : "count";
  if (section === "meta") return t < 0.55 ? "count" : "percent";
  if (section === "weird") return t < 0.70 ? "count" : "range";

  // fallback
  return profile.intensity > 0.6 ? "percent" : "count";
}

function makePercent(rng: RNG, profile: Profile, section: FactSectionKey): string {
  // percentá drž v realistickom pásme
  let base = 40 + 30 * randomNormalish(rng); // cca 40–70
  // posuny podľa profilu
  base += (profile.control - 0.5) * 12;
  base += (profile.chaos - 0.5) * 10;

  // jemný sekčný bias
  if (section === "mind") base += 6 * (profile.intensity - 0.5);
  if (section === "body") base -= 4 * (profile.openness - 0.5);
  if (section === "meta") base += 3;
  if (section === "time") base += (rng() - 0.5) * 8;

  const p = Math.round(clamp(base, 18, 88));
  return `${p} %`;
}

function makeCount(rng: RNG, profile: Profile, section: FactSectionKey, daysAlive: number): string {
  // škáluj podľa života, ale nie lineárne brutálne
  const lifeScale = clamp(daysAlive / 10_000, 0.6, 2.4); // cca 0.6–2.4
  let min = 20;
  let max = 400;

  if (section === "social") { min = 40; max = 900; }
  if (section === "time")   { min = 20; max = 420; }
  if (section === "mind")   { min = 60; max = 1400; }
  if (section === "body")   { min = 30; max = 800; }
  if (section === "name")   { min = 2000; max = 220_000; } // “meno vyslovené” vibe
  if (section === "meta")   { min = 30; max = 650; }
  if (section === "weird")  { min = 8;  max = 220; }

  // profil ovplyvňuje rozptyl
  const widen = 1 + (profile.chaos * 0.9) + (profile.intensity * 0.6);
  const low = Math.round(min * lifeScale);
  const high = Math.round(max * lifeScale * widen);

  const n = intBetween(rng, low, high);

  // name counts vyzerajú lepšie s pluskom
  if (section === "name") {
    const capped = clamp(n, 2500, 480_000);
    return `${formatInt(capped)}+`;
  }

  return formatInt(clamp(n, 1, 999_999));
}

function makeRange(rng: RNG, profile: Profile, section: FactSectionKey, daysAlive: number): string {
  // rozsahy vyzerajú legit, keď majú 2–5x rozdiel
  const mid = Number(makeCount(rng, profile, section, daysAlive).replace(/\D/g, "")) || 120;

  const factorLow = clamp(0.55 + 0.25 * randomNormalish(rng), 0.35, 0.85);
  const factorHigh = clamp(2.2 + 1.4 * randomNormalish(rng) + profile.chaos * 0.6, 1.8, 4.8);

  const low = Math.max(1, Math.round(mid * factorLow));
  const high = Math.max(low + 2, Math.round(mid * factorHigh));

  return `${formatInt(low)}–${formatInt(high)}`;
}

function makeValue(
  rng: RNG,
  profile: Profile,
  section: FactSectionKey,
  kind: FactValueKind,
  daysAlive: number
): string {
  if (kind === "percent") return makePercent(rng, profile, section);
  if (kind === "count") return makeCount(rng, profile, section, daysAlive);
  return makeRange(rng, profile, section, daysAlive);
}

/**
 * Hlavná funkcia: vráti bloky faktov pripravené na render.
 * Je deterministická pre rovnaké (name|dob|rid).
 */
export function buildFactBlocks(input: {
  name: string;
  dobISO: string;
  rid: string;
  daysAlive: number;
  // koľko riadkov na sekciu v free časti (defaulty sú bezpečné)
  rowsPerSection?: { min: number; max: number };
}): FactBlock[] {
  const seedStr = `${input.name}|${input.dobISO}|${input.rid}|facts`;
  const rng = makeRng(seedStr);
  const profile = buildProfile(rng, input.name, input.dobISO);

  const rowsMin = input.rowsPerSection?.min ?? 2;
  const rowsMax = input.rowsPerSection?.max ?? 3;

  const sections = chooseSections(rng, profile);

  // globálne sledovanie IDčiek, aby sa nič neopakovalo naprieč sekciami
  const usedTitleIds = new Set<string>();

  const blocks: FactBlock[] = [];

  for (const section of sections) {
    const want = intBetween(rng, rowsMin, rowsMax);
    const picked = pickTitlesForSection(rng, section, want)
      .filter((t) => !usedTitleIds.has(t.id));

    // ak sa niečo vyfiltrovalo, doplň zvyšok z poolu
    const pool = factTitles[section];
    while (picked.length < want) {
      const candidate = pool[Math.floor(rng() * pool.length)];
      if (!usedTitleIds.has(candidate.id)) picked.push(candidate);
      if (picked.length > pool.length) break;
    }

    const rows: FactRow[] = picked.map((t) => {
      usedTitleIds.add(t.id);

      const kind = decideKind(rng, section, profile);
      const value = makeValue(rng, profile, section, kind, input.daysAlive);

      return {
        id: t.id,
        title: t.title,
        kind,
        value,
        note: note(rng),
        section,
      };
    });

    blocks.push({
      section,
      heading: SECTION_HEADINGS[section],
      rows,
    });
  }

  return blocks;
}
