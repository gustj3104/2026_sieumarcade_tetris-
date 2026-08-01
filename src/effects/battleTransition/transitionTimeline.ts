/**
 * Single source of truth for the post-finale "battle transition" timeline
 * (the celebratory hand-off from the auto-playing tetris show to the live
 * band battle). Every component/module that needs a duration reads from
 * here instead of hard-coding its own copy in CSS or TS.
 */
export const BATTLE_TRANSITION_TIMING = {
  allPlayersReady: 800,
  charging: 1000,
  readyPrompt: 500,
  burst: 1200,
  keyVisualReveal: 1500,
} as const;

export type BattleTransitionStep = keyof typeof BATTLE_TRANSITION_TIMING;

export const BATTLE_TRANSITION_ORDER: BattleTransitionStep[] = [
  "allPlayersReady",
  "charging",
  "readyPrompt",
  "burst",
  "keyVisualReveal",
];

/** Full-phase list including the pre-timeline settle and the persistent post-timeline hold. */
export type BattleTransitionPhase = "idle" | BattleTransitionStep | "battleOpen";
