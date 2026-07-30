export const SCORE_LOCK = 500;

/** Indexed by number of simultaneously cleared lines (0..4). */
export const SCORE_LINES = [0, 1000, 3000, 5000, 8000];

export const COMBO_BONUS_STEP = 200;

/** Score awarded for clearing `lines` lines while on combo streak `combo` (0 = first in a streak). */
export function lineClearScore(lines: number, combo: number): number {
  if (lines <= 0) return 0;
  const base = SCORE_LINES[Math.min(lines, 4)];
  const comboBonus = combo > 0 ? combo * COMBO_BONUS_STEP : 0;
  return base + comboBonus;
}
