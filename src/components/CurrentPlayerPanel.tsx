import { useEffect, useRef, useState } from "react";
import { useGameSnapshot } from "../state/gameStore";
import { PixelFrame } from "./PixelFrame";

export function CurrentPlayerPanel() {
  const snap = useGameSnapshot();
  const name = snap.lastLanding?.participant.name ?? "-";
  const [pulse, setPulse] = useState(false);
  const prevName = useRef<string | null>(null);

  useEffect(() => {
    const changed = prevName.current !== null && prevName.current !== name;
    prevName.current = name;
    if (!changed) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 400);
    return () => window.clearTimeout(timer);
  }, [name]);

  return (
    <PixelFrame className="player-panel" data-bt-unit="left-frame">
      <div className="panel-title">PLAYER</div>
      <div className={`player-panel-name ${pulse ? "pulse" : ""}`} data-bt-unit="player-name">{name}</div>
      <div className="player-panel-hearts" aria-hidden="true">
        <span className="player-panel-heart" data-bt-unit="player-heart">♥</span>
        <span className="player-panel-heart" data-bt-unit="player-heart">♥</span>
        <span className="player-panel-heart" data-bt-unit="player-heart">♥</span>
      </div>
    </PixelFrame>
  );
}
