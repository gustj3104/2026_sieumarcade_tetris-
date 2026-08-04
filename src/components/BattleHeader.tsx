import { useBattleTransition } from "../hooks/useBattleTransition";
import keyVisual from "../assets/keyvisual.png";

/**
 * Center-top event key-visual. Shows the official SIEUMCLUB [LIVE BATTLE]
 * artwork (same asset/priority as the battle-open ending's key visual: an
 * admin-uploaded logo, if set, overrides the bundled default).
 */
export function BattleHeader() {
  const { phase, style, logoUrl } = useBattleTransition();
  const src = logoUrl ?? keyVisual;
  return (
    <div className={`battle-header bt-header bt-header-${phase}`} style={style}>
      <div className="battle-header-see">SEE THE SOUND</div>
      <div className="battle-header-logo-wrap">
        <img src={src} alt="SIEUMCLUB [LIVE BATTLE]" className="battle-header-logo-img" data-bt-unit="header-deco" />
      </div>
    </div>
  );
}
