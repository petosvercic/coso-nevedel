import fs from "fs/promises";

const FILE = new URL("../app/data/famousBirthdays.json", import.meta.url);
const OUT = new URL("../app/data/famousBirthdays.json", import.meta.url);

// Wikipedia REST summary endpoint
async function wikiSummary(title, lang = "en") {
  const url =
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/` +
    encodeURIComponent(title);
  const r = await fetch(url, {
    headers: { "user-agent": "coso-nevedel/1.0 (enricher)" },
  });
  if (!r.ok) return null;
  return await r.json();
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function cleanExtract(text) {
  if (!text) return null;
  // zober prvú vetu alebo dve, bez zbytočných zátvoriek
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 220 ? t.slice(0, 220).replace(/\s+\S*$/, "") + "…" : t;
}

async function findBestSummary(name) {
  // 1) skúsi en
  const s1 = await wikiSummary(name, "en");
  if (s1?.extract) return { lang: "en", extract: cleanExtract(s1.extract) };

  // 2) fallback: sk (nie vždy existuje)
  const s2 = await wikiSummary(name, "sk");
  if (s2?.extract) return { lang: "sk", extract: cleanExtract(s2.extract) };

  return null;
}

async function main() {
  const raw = await fs.readFile(FILE, "utf8");
  const data = JSON.parse(raw);

  let total = 0;
  let updated = 0;

  for (const [day, arr] of Object.entries(data)) {
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || typeof item !== "object") continue;

      total++;

      // preskoč ak už má note
      if (item.note && String(item.note).trim().length > 0) continue;

      const name = item.name;
      console.log(`LOOKUP ${day} -> ${name}`);

      const sum = await findBestSummary(name);
      if (sum?.extract) {
        item.note = sum.extract; // sem ide “kto to je”
        updated++;
        console.log(`  OK (${sum.lang})`);
      } else {
        item.note = null;
        console.log(`  MISS`);
      }

      // šetríme API, aby nás nezarezali
      await sleep(350);
    }
  }

  await fs.writeFile(OUT, JSON.stringify(data, null, 2), "utf8");

  console.log(`Done. total persons: ${total}, updated: ${updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
