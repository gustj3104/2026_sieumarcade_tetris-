import { useBattleTransition } from "../hooks/useBattleTransition";

/** Center-top event key-visual: a from-scratch retro arcade wordmark, not a copied logo asset. */
export function BattleHeader() {
  const { phase, style } = useBattleTransition();
  return (
    <div className={`battle-header bt-header bt-header-${phase}`} style={style}>
      <div className="battle-header-see">SEE THE SOUND</div>
      <div className="battle-header-logo-wrap">
        <div className="battle-header-rainbow" aria-hidden="true" />
        <div className="battle-header-star" aria-hidden="true" />
        <div className="battle-header-logo">SIEUMARCADE</div>
      </div>
      <div className="battle-header-sub">[ LIVE BAND BATTLE ]</div>
    </div>
  );
}
