import { useEffect, useState } from "react";
import { useGameSnapshot } from "../state/gameStore";
import { useBattleTransition } from "../hooks/useBattleTransition";
import { PixelFrame } from "./PixelFrame";

export function StatsPanel() {
  const snap = useGameSnapshot();
  const { phase, style } = useBattleTransition();

  // During the "charging" beat only, the SCORE/COMBO readouts get a brief
  // fake-rush display. The real score/combo in the engine snapshot is never
  // touched - this is purely a local, self-resetting display value.
  const [chargeDisplayScore, setChargeDisplayScore] = useState<number | null>(null);
  const [chargeComboMax, setChargeComboMax] = useState(false);
  const [chargeLevelText, setChargeLevelText] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "charging") {
      setChargeDisplayScore(null);
      setChargeComboMax(false);
      setChargeLevelText(null);
      return;
    }
    const from = snap.score;
    const to = from + 8000 + Math.floor(Math.random() * 4000);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      setChargeDisplayScore(Math.floor(from + (to - from) * t));
      setChargeComboMax(t > 0.25 && t < 0.9);
      setChargeLevelText(t > 0.6 ? "LIVE" : null);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intentionally keyed on `phase` alone: re-running this on every score
    // tick would restart the rush animation instead of playing it once.
  }, [phase]);

  const scoreStr = String(chargeDisplayScore ?? snap.score).padStart(6, "0");
  const linesStr = String(snap.linesCleared).padStart(3, "0");
  const comboStr = chargeComboMax ? "MAX" : String(snap.comboCount).padStart(2, "0");
  const levelStr = chargeLevelText ?? String(snap.level).padStart(2, "0");

  return (
    <PixelFrame className={`stats-panel bt-stats bt-stats-${phase}`} style={style} data-bt-unit="right-frame">
      <div className="panel-title">STATS</div>
      <div className="panel-body">
        <div className="stats-row" data-bt-unit="stats-row">
          <span className="stats-label">ENTRY</span>
          <span className="stats-value">
            {snap.entryIndex} / {snap.totalParticipants || "-"}
          </span>
        </div>
        <div className="stats-row" data-bt-unit="stats-row">
          <span className="stats-label">SCORE</span>
          <span className="stats-value">{scoreStr}</span>
        </div>
        <div className="stats-row" data-bt-unit="stats-row">
          <span className="stats-label">LINES</span>
          <span className="stats-value">{linesStr}</span>
        </div>
        <div className="stats-row" data-bt-unit="stats-row">
          <span className="stats-label">COMBO</span>
          <span className="stats-value">{comboStr}</span>
        </div>
        <div className="stats-row" data-bt-unit="stats-row">
          <span className="stats-label">LEVEL</span>
          <span className="stats-value">{levelStr}</span>
        </div>
      </div>
    </PixelFrame>
  );
}
