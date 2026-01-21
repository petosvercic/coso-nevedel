// app/data/analogies.ts
export type AnalogyTemplate = {
  id: string;
  text: string; // použije {days}
};

export const analogies: AnalogyTemplate[] = [
  { id: "avg-hens", text: "{days} dní. Približne priemerný život ~6000 nosníc. Áno, aj toto je štatistika." },
  { id: "netflix", text: "{days} dní. Dosť času na prežutie celého Netflixu... a aj tak by si nenašiel nič na večer." },
  { id: "walk-5km", text: "{days} dní. Keby si každý deň prešiel 5 km, bol by si už niekde medzi ‚urobil som to raz‘ a ‚nikdy viac‘." },
  { id: "calendar", text: "{days} dní. Tolkokrát si zaspal s tým, že zajtra budeš iný človek." },
  { id: "habits", text: "{days} dní. Väčšinu z nich si prežil na autopilote. Neber to osobne, tak funguje mozog." },
  { id: "messages", text: "{days} dní. Keby si každý deň poslal jednu správu človeku, čo ti chýba, dnes by si mal menej otázok." },
  { id: "photos", text: "{days} dní. Toľko dní, koľko fotiek máš v mobile… a stále sa bojíš vymazať rozmazané." },
  { id: "decisions", text: "{days} dní. Tolkokrát si si myslel, že máš plán. A potom prišiel život a zasmial sa." },
  { id: "time", text: "{days} dní. Dosť na to, aby sa z ‚raz‘ stalo ‚nikdy‘ a z ‚nikdy‘ zas ‚raz‘." },
  { id: "quiet", text: "{days} dní. A aj tak nevieš, kedy si naposledy sedel potichu bez potreby niečo riešiť." },
];
