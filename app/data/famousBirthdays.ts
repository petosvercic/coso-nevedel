// app/data/famousBirthdays.ts

export type FamousBirthdayEntry =
  | string
  | {
      name: string;
      note?: string;
    };

export const famousBirthdays: Record<string, FamousBirthdayEntry[]> = {
  // kľúč je "MM-DD"
  "01-01": ["J. D. Salinger", "Betsy Ross"],
  "02-08": [
    { name: "James Dean", note: "herec" },
    { name: "Jules Verne", note: "spisovateľ" },
  ],
  "03-14": [{ name: "Albert Einstein", note: "fyzik" }],
  "04-15": [{ name: "Leonardo da Vinci", note: "umelec a vynálezca" }],
  "05-05": [{ name: "Karl Marx", note: "filozof" }],
  "06-26": [{ name: "Ariana Grande", note: "speváčka" }],
  "07-18": [{ name: "Nelson Mandela", note: "politik" }],
  "08-04": [{ name: "Barack Obama", note: "politik" }],
  "10-05": [{ name: "Steve Jobs", note: "technológie" }],
  "12-25": [{ name: "Isaac Newton", note: "fyzik" }],
};
