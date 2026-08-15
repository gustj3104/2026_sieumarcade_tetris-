import { useBattleTransition } from "../hooks/useBattleTransition";

/** Center-top event title: "SIEUM ARCADE" in solid yellow pixel font. */
export function BattleHeader() {
  const { phase, style } = useBattleTransition();
  return (
    <div className={`battle-header bt-header bt-header-${phase}`} style={style}>
      <div className="battle-header-logo-wrap">
        <span className="battle-header-word" data-bt-unit="header-deco">
          SIEUM ARCADE
        </span>
      </div>
    </div>
  );
}
