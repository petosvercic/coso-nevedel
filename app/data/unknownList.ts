// app/data/unknownList.ts
export type UnknownItem = {
  title: string;       // viditeľné
  blurredHint: string; // rozmazané (použije {n})
};

export const unknownItems: UnknownItem[] = [
  { title: "Koľkokrát si sa pravdepodobne nadýchol", blurredHint: "≈ {n}× · a väčšina z nich bola úplne automatická" },
  { title: "Koľko rozhodnutí si urobil bez toho, aby si si to uvedomil", blurredHint: "≈ {n} · vedomých bolo len smiešne málo" },
  { title: "Koľko krát ti udrelo srdce", blurredHint: "≈ {n}× · a stále sa tváriš, že máš čas" },
  { title: "Koľkokrát si žmurkol", blurredHint: "≈ {n}× · polovicu z toho v rozpakoch" },
  { title: "Koľko ľudí si nepriamo ovplyvnil", blurredHint: "≈ {n} · viac než si ochotný priznať" },
];
