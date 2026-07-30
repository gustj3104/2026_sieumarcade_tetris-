import { useSyncExternalStore } from "react";
import { TetrisEngine } from "../game/gameLoop";

/** A single engine instance shared by the whole app (audience canvas + admin panel). */
export const engine = new TetrisEngine();

/** HUD-facing React binding. Re-renders only on discrete state changes (not every animation frame). */
export function useGameSnapshot() {
  return useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.getSnapshot(),
  );
}
