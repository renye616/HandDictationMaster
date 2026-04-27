export interface KanaChar {
  hiragana: string;
  katakana: string;
  romaji: string;
  audioKey?: string;
}

export type KanaGroup = {
  name: string;
  rows: (KanaChar | null)[][];
};

export type Stats = {
  total: number;
  correct: number;
  incorrect: number;
  failed: string[]; // Romaji of failed ones
};
