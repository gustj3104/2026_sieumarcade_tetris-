/**
 * Single source of truth for the post-finale "battle open" timeline (the
 * hand-off from the auto-playing tetris show to the live band battle).
 * Every module that needs a duration - the engine's finale step machine,
 * the particle field, and the DOM/CSS transition components - reads from
 * here instead of keeping its own copy.
 *
 * `settle` is not a fixed timer: the engine already waits for the falling
 * piece to land (and any line-clear it triggers) before starting the
 * timeline below, which is more correct than a flat 600ms. It's listed
 * here only as the documented nominal length referenced by the design.
 */
export const BATTLE_OPEN_TIMING = {
  settle: 1200,
  playersReady: 1600,
  charging: 2400,
  readyPrompt: 1000,
  burst: 2200,
  keyVisualAssembly: 3000,
  battleTextReveal: 1600,
} as const;

export type BattleTransitionStep = Exclude<keyof typeof BATTLE_OPEN_TIMING, "settle">;

export const BATTLE_TRANSITION_ORDER: BattleTransitionStep[] = [
  "playersReady",
  "charging",
  "readyPrompt",
  "burst",
  "keyVisualAssembly",
  "battleTextReveal",
];

/** Full DOM-facing phase list including the idle/settle bookends and the persistent post-timeline hold. */
export type BattleTransitionPhase = "idle" | "settling" | BattleTransitionStep | "battleOpen";
