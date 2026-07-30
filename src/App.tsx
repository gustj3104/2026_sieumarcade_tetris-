import { useEffect, useRef, useState } from "react";
import { ArcadeShell } from "./components/ArcadeShell";
import { AdminPanel } from "./components/AdminPanel";
import { engine } from "./state/gameStore";
import "./App.css";

const FINALE_HOLD_MS = 2000;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function App() {
  const [adminOpen, setAdminOpen] = useState(false);
  const enterHoldTimer = useRef<number | null>(null);
  const enterHoldFired = useRef(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAdminOpen((open) => !open);
        return;
      }
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          engine.togglePause();
          break;
        case "n":
        case "N":
          engine.instantDrop();
          break;
        case "r":
        case "R":
          engine.reset();
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          break;
        case "Enter":
          if (enterHoldTimer.current === null && !enterHoldFired.current) {
            enterHoldTimer.current = window.setTimeout(() => {
              engine.triggerFinale();
              enterHoldFired.current = true;
              enterHoldTimer.current = null;
            }, FINALE_HOLD_MS);
          }
          break;
        default:
          break;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Enter") {
        if (enterHoldTimer.current !== null) {
          window.clearTimeout(enterHoldTimer.current);
          enterHoldTimer.current = null;
        }
        enterHoldFired.current = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="app-root">
      <ArcadeShell />
      <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}

export default App;
