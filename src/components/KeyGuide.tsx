import { PixelFrame } from "./PixelFrame";

/** Mirrors the actual bindings wired in App.tsx exactly - admin-only keys (Esc, F) are left off audience view. */
const KEYS: { key: string; desc: string }[] = [
  { key: "Space", desc: "일시정지 / 재생" },
  { key: "N", desc: "즉시 낙하" },
  { key: "R", desc: "다시 시작" },
  { key: "Enter (2s)", desc: "게임 종료" },
];

export function KeyGuide() {
  return (
    <PixelFrame className="key-guide-panel" data-bt-unit="right-frame">
      <div className="panel-title">KEY GUIDE</div>
      <div className="panel-body">
        <div className="key-guide-list">
          {KEYS.map(({ key, desc }) => (
            <div key={key} className="key-guide-row" data-bt-unit="key-guide-row">
              <span className="key-guide-key">{key}</span>
              <span className="key-guide-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </PixelFrame>
  );
}
