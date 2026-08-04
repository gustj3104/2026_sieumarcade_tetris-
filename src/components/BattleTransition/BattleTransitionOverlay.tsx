import { useBattleTransition } from "../../hooks/useBattleTransition";
import { BattleParticleField } from "./BattleParticleField";
import { PlayersReadyText } from "./PlayersReadyText";
import { ReadyPromptText } from "./ReadyPromptText";
import { KeyVisualStage } from "./KeyVisualStage";

/**
 * Everything in the battle-open transition that needs to sit above (and
 * outside) the board canvas + side panels: the particle field, the big
 * screen-wide typography beats, and the key-visual/BATTLE STARTS NOW hold
 * screen. The board's own charge-up glow and the panels' burst-apart CSS
 * live with their real elements (renderer.ts, LeftPanel/RightPanel/
 * BattleHeader) so each destroyed thing animates from its own real spot.
 */
export function BattleTransitionOverlay() {
  const { phase, logoUrl } = useBattleTransition();

  return (
    <>
      <BattleParticleField />
      <div className={`bt-overlay bt-overlay-${phase}`} aria-hidden="true">
        {phase === "playersReady" && <PlayersReadyText />}
        {phase === "readyPrompt" && <ReadyPromptText />}
        {(phase === "keyVisualAssembly" || phase === "battleTextReveal" || phase === "battleOpen") && (
          <KeyVisualStage logoUrl={logoUrl} />
        )}
      </div>
    </>
  );
}
