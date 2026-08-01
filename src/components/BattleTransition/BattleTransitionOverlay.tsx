import { useBattleTransition } from "../../hooks/useBattleTransition";
import { ReadyPrompt } from "./ReadyPrompt";
import { BattleOpenScreen } from "./BattleOpenScreen";

/**
 * Full-viewport pieces of the battle transition that need to sit above (and
 * outside) the board canvas + side panels: the READY? screen flash, and the
 * key-visual / BATTLE STARTS NOW hold screen. Everything else (ALL PLAYERS
 * READY text, the energy/burst effects on the board itself) lives in the
 * canvas renderer; the panel/header burst-and-fade lives as CSS classes on
 * LeftPanel/RightPanel/BattleHeader directly.
 */
export function BattleTransitionOverlay() {
  const { phase, logoUrl, style } = useBattleTransition();

  return (
    <div className={`bt-overlay bt-overlay-${phase}`} style={style} aria-hidden="true">
      {phase === "readyPrompt" && <ReadyPrompt />}
      {(phase === "keyVisualReveal" || phase === "battleOpen") && <BattleOpenScreen logoUrl={logoUrl} />}
    </div>
  );
}
