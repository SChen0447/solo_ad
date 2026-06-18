export interface DiceConfig {
  diceCount: number;
  sides: number;
  modifier?: number;
}

export interface DiceResult {
  rolls: number[];
  modifier: number;
  total: number;
  detail: string;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function rollSingleDie(sides: number, rng: () => number): number {
  return Math.floor(rng() * sides) + 1;
}

export function roll(config: DiceConfig, seed?: number): DiceResult {
  const rng = seed !== undefined ? seededRandom(seed) : () => Math.random();
  const { diceCount, sides, modifier = 0 } = config;
  const rolls: number[] = [];
  for (let i = 0; i < diceCount; i++) {
    rolls.push(rollSingleDie(sides, rng));
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;
  const rollDetail = rolls.join('+');
  const detail =
    modifier !== 0
      ? `${diceCount}D${sides}${modifier > 0 ? '+' : ''}${modifier} = ${total} (${rollDetail}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''})`
      : `${diceCount}D${sides} = ${total} (${rollDetail})`;
  return { rolls, modifier, total, detail };
}
