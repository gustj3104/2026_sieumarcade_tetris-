import { useBattleTransition } from "../hooks/useBattleTransition";
import keyVisual from "../assets/keyvisual.png";

/**
 * Center-top event key-visual: "SIEUM [key visual] ARCADE" on one line.
 * The key visual (same asset/priority as the battle-open ending's key
 * visual - an admin-uploaded logo, if set, overrides the bundled default)
 * sits between the two pixel-font words.
 */
export function BattleHeader() {
  const { phase, style, logoUrl } = useBattleTransition();
  const src = logoUrl ?? keyVisual;
  return (
    <div className={`battle-header bt-header bt-header-${phase}`} style={style}>
      <div className="battle-header-logo-wrap">
        <span className="battle-header-word">SIEUM</span>
        <img src={src} alt="키비주얼" className="battle-header-logo-img" data-bt-unit="header-deco" />
        <span className="battle-header-word">ARCADE</span>
      </div>
    </div>
  );
}
