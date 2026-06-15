export const MAX_DIVINE_SENSE = 100;
export const ANNUAL_DIVINE_SENSE_RECOVERY = 10;
export const MAX_DECREE_CHARS = 100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const nonContentPattern = /^[\p{P}\p{Z}\s]$/u;

export function countDecreeChars(decree: string) {
  return Array.from(decree.trim()).filter((char) => !nonContentPattern.test(char)).length;
}

export function trimDecreeToMaxChars(decree: string) {
  let count = 0;
  let result = "";

  for (const char of Array.from(decree)) {
    if (nonContentPattern.test(char)) {
      result += char;
      continue;
    }

    if (count >= MAX_DECREE_CHARS) continue;
    count += 1;
    result += char;
  }

  return result;
}

export function calculateDivineSenseCost(decree: string) {
  return clamp(countDecreeChars(decree), 0, MAX_DECREE_CHARS);
}
