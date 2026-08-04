import { useBattleTransition } from "../../hooks/useBattleTransition";
import bundledKeyVisual from "../../assets/keyvisual.svg";

interface KeyVisualStageProps {
  logoUrl: string | null;
}

/**
 * The official SIEUMARCADE key visual assembling out of the burst, then
 * BATTLE STARTS NOW, then the persisted battle-open hold. All three share
 * one mounted component (rather than swapping components per phase) so the
 * key visual never remounts/re-triggers its reveal animation partway
 * through - it plays once, then the same element just keeps breathing.
 *
 * Asset priority: an admin-uploaded logo (AdminPanel "행사 로고", the
 * highest-priority override at event time) beats the bundled default
 * (src/assets/keyvisual.svg, imported so Vite resolves it under the
 * GitHub Pages base path automatically - never a hardcoded absolute path).
 */
export function KeyVisualStage({ logoUrl }: KeyVisualStageProps) {
  const { phase } = useBattleTransition();
  const src = logoUrl ?? bundledKeyVisual;

  return (
    <div className={`bt-stage bt-stage-${phase}`} aria-hidden="true">
      <div className="bt-stage-rays" />
      <img src={src} alt="" className="bt-keyvisual-img" />
      <div className="bt-battle-starts">
        <span>BATTLE STARTS NOW</span>
      </div>
      <div className="bt-stage-bottomline" />
    </div>
  );
}
