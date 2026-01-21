export const notes = {
  westernZodiac: [
    "{zodiac}: typ človeka, čo vyzerá pokojne, kým mu niekto nesiahne na nervy.",
    "{zodiac}: život ti dáva príležitosť vyzerať múdro. Ty dávaš životu chaos.",
    "{zodiac}: schopnosť predstierať, že máš všetko pod kontrolou je až podozrivá.",
    "{zodiac}: prirodzený talent robiť veci po svojom, aj keď je to objektívne horší nápad.",
  ],

  // (legacy) všeobecné template vety, keby si ich niekde používal
  chineseZodiac: [
    "{cz}: ročný build osobnosti, ktorý sa tvári ako osud.",
    "{cz}: legenda hovorí, že si tvrdohlavý. Realita: áno.",
    "{cz}: nie si problém. Si funkcia, ktorú nikto netestoval.",
  ],

  // Presné popisky pre každé čínske znamenie (1 veta, “pravdivé na pocit”)
  chineseZodiacByAnimal: {
    Potkan: ["Rýchlo chápeš a prispôsobíš sa. Niekedy až tak, že nevieš, kedy si zmenil názor."],
    Byvol: ["Vydržíš viac než ostatní. Otázka je, či to vždy stojí za to."],
    Tiger: ["Máš silu ísť proti prúdu. Problém je, keď ideš proti všetkému."],
    Zajac: ["Vieš sa vyhnúť konfliktom. Aj tým, ktoré by stálo za to podstúpiť."],
    Drak: ["Ľudia ťa vnímajú výraznejšie, než si myslíš. Ty sám často netušíš prečo."],
    Had: ["Premýšľaš hlbšie než dávaš najavo. Nie vždy je to pre teba výhoda."],
    "Kôň": ["Potrebuješ pohyb, zmenu, impulz. Zotrvanie ťa unavuje rýchlejšie než ostatných."],
    Koza: ["Si citlivejší, než pôsobíš. A tvrdší, než by si si priznal."],
    Opica: ["Vieš veci otočiť vo svoj prospech. Niekedy aj vtedy, keď by si nemal."],
    Kohút: ["Záleží ti na poriadku a pravde. Hlavne na tej svojej."],
    Pes: ["Vieš byť lojálny. Keď sa sklamanie nazbiera, pamätáš si ho dlho."],
    Prasa: ["Vieš si užívať prítomnosť. Občas až na úkor budúcnosti."],
  } as const,

  daysAlive: [
    "{days} dní na svete. Dosť času na pár omylov aj pár pekných náhod.",
    "{days} dní existencie. To je už celkom slušná séria epizód.",
    "{days} dní. A stále sa tvárime, že máme čas.",
  ],

  // Jemnejšie, “kuriozita dňa” (nie Wikipedia, nie bulvár)
  famous: [
    "V tento deň sa začalo niečo, čo si vtedy všimol málokto.",
    "Niečo, čo dnes berieme ako samozrejmosť, malo v tento deň nenápadný začiatok.",
    "V tento deň vznikli veci, ktorých význam sa ukázal až neskôr.",
    "Dnes sa stalo niečo, čo vtedy pôsobilo obyčajne.",
    "Nie všetko dôležité sa v tento deň tvárilo dôležito.",
    "Niektoré príbehy sa začínajú ticho. Tento je jedným z nich.",
  ],

  blurredIntro: [
    "Čo ďalej určite nevieš:",
    "A teraz to príde:",
    "Ďalšie veci, ktoré si o sebe neplánoval zistiť:",
  ],
} as const;
