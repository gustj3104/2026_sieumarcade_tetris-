import { useBattleTransition } from "../hooks/useBattleTransition";

const ANNOUNCEMENTS: Partial<Record<ReturnType<typeof useBattleTransition>["phase"], string>> = {
  allPlayersReady: "ALL PLAYERS READY",
  charging: "ALL PLAYERS READY",
  readyPrompt: "READY?",
  burst: "READY?",
  keyVisualReveal: "BATTLE STARTS NOW",
  battleOpen: "BATTLE STARTS NOW",
};

/**
 * Most finale visuals (board energy wave, burst, key-visual reveal) are
 * drawn by rendering/renderer.ts and components/BattleTransition for tight
 * sync with the particle system. This component only carries the accessible
 * announcement so screen readers get the same beats the audience sees.
 */
export function FinaleOverlay() {
  const { phase } = useBattleTransition();
  return (
    <div className="sr-only" aria-live="polite">
      {ANNOUNCEMENTS[phase] ?? ""}
    </div>
  );
}
