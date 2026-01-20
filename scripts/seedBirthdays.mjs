// scripts/seedBirthdays.mjs
import fs from "node:fs";
import path from "node:path";

const OUT_PATH = path.join(process.cwd(), "app", "data", "famousBirthdays.json");

// Wikimedia “On this day” feed (English). Nie je 100% garantované, že bude mať births pre každý deň.
function makeUrl(mm, dd) {
  // mm, dd sú "01".."12" a "01".."31"
  return `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/births/${mm}/${dd}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function loadExisting() {
  try {
    if (!fs.existsSync(OUT_PATH)) return {};
    const raw = fs.readFileSync(OUT_PATH, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.log("WARN: Neviem načítať existujúci JSON, idem od nuly.", e?.message ?? e);
    return {};
  }
}

function save(obj) {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(obj, null, 2), "utf8");
}

function normalizeEntry(item) {
  // Wikimedia feed zvyčajne dáva:
  // { text, pages: [{ title, extract, ... }] }
  // Nás zaujíma title + prípadne note (extract skrátený)
  const title =
    item?.pages?.[0]?.normalizedtitle ||
    item?.pages?.[0]?.title ||
    item?.text ||
    null;

  if (!title) return null;

  const extract = item?.pages?.[0]?.extract || "";
  const note = extract ? extract.slice(0, 120).trim() : undefined;

  return note ? { name: title, note } : { name: title };
}

// robust fetch s timeoutom + retry
async function safeFetchJSON(url, { timeoutMs = 15000, retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "accept": "application/json",
          // slušnosť, aby nás nebanovali
          "user-agent": "coso-nevedel/1.0 (seed script)",
        },
      });

      clearTimeout(t);

      if (!res.ok) {
        // rate limit / server hiccup
        const msg = `HTTP ${res.status}`;
        if (attempt < retries) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(msg);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(t);
      const isLast = attempt === retries;

      // “terminated / socket closed / aborted” = klasika, len retry
      if (!isLast) {
        await sleep(700 * attempt);
        continue;
      }
      return null;
    }
  }
  return null;
}

function daysInMonth(mm) {
  const m = Number(mm);
  if ([1, 3, 5, 7, 8, 10, 12].includes(m)) return 31;
  if ([4, 6, 9, 11].includes(m)) return 30;
  return 29; // február necháme 29, lebo feed má aj 02/29
}

function keyFor(mm, dd) {
  return `${mm}-${dd}`;
}

async function main() {
  const result = loadExisting();

  console.log("Seedujem famous birthdays ->", OUT_PATH);
  console.log("Už mám uložených dní:", Object.keys(result).length);

  for (let m = 1; m <= 12; m++) {
    const mm = pad2(m);
    const dim = daysInMonth(mm);

    for (let d = 1; d <= dim; d++) {
      const dd = pad2(d);
      const key = keyFor(mm, dd);

      // Ak už deň existuje a má aspoň 1 entry, preskoč
      if (Array.isArray(result[key]) && result[key].length > 0) {
        console.log(`SKIP ${key} -> already ${result[key].length} entries`);
        continue;
      }

      const url = makeUrl(mm, dd);
      const data = await safeFetchJSON(url, { timeoutMs: 15000, retries: 4 });

      if (!data) {
        console.log(`RETRY-LATER ${key} -> fetch vrátil null (socket/timeout)`);
        await sleep(250);
        continue;
      }

      // Wikimedia feed by mal mať "births": []
      const births = Array.isArray(data.births) ? data.births : null;

      if (!births) {
        console.log(`RETRY-LATER ${key} -> odpoveď nemá "births" (nezapisujem)`);
        await sleep(250);
        continue;
      }

      const entries = births
        .map(normalizeEntry)
        .filter(Boolean)
        // max 6 (aby to bolo “crazy ale nie nekonečné”)
        .slice(0, 6);

      if (entries.length > 0) {
        result[key] = entries;
        save(result);
        console.log(`OK ${key} -> ${entries.length} entries`);
      } else {
        // nič nezapisuj, len preskoč (môže byť dočasný glitch alebo prázdny deň)
        console.log(`SKIP ${key} -> 0 entries (nezapisujem, skúsim neskôr)`);
      }

      // malý delay = menej šanca, že dostaneš ban/rate limit
      await sleep(250);
    }
  }

  console.log("Hotovo. Uložené dni:", Object.keys(result).length);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
