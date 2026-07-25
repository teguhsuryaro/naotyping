/**
 * Utility to generate lists of random words from a given word bank.
 */
export function getRandomWords(wordBank: string[], count: number = 15): string[] {
  if (!wordBank || wordBank.length === 0) {
    return [];
  }
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * wordBank.length);
    result.push(wordBank[randomIndex]);
  }
  return result;
}
