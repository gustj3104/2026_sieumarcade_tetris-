import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { engine, useGameSnapshot } from "../state/gameStore";
import { parseParticipants, MAX_PARTICIPANTS } from "../utils/nameParser";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Operator-only control surface. Mounted once by App and toggled with CSS
 * (not conditional rendering) so textarea/upload state survives Esc
 * open/close. Never shown to the audience view.
 */
export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const snap = useGameSnapshot();
  const [text, setText] = useState("");
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [logoName, setLogoName] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    };
  }, []);

  function handleApply() {
    const result = parseParticipants(text);
    setDuplicates(result.duplicates);
    setTruncated(result.truncated);
    engine.loadParticipants(result.participants);
  }

  function handleEndClick() {
    if (confirmEnd) {
      engine.triggerFinale();
      setConfirmEnd(false);
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    } else {
      setConfirmEnd(true);
      confirmTimer.current = window.setTimeout(() => setConfirmEnd(false), 4000);
    }
  }

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        engine.setLogo(reader.result);
        setLogoName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className={`admin-panel ${isOpen ? "admin-panel-open" : "admin-panel-closed"}`}>
      <div className="admin-panel-inner">
        <div className="admin-header">
          <h1>ADMIN</h1>
          <button type="button" onClick={onClose} className="admin-close">
            닫기 (Esc)
          </button>
        </div>

        <section className="admin-section">
          <h2>참가자 명단</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"윤현지\n김민정\n이호진\nHERA\nSIMON"}
            rows={10}
          />
          <div className="admin-row">
            <button type="button" onClick={handleApply}>
              명단 적용
            </button>
            <span className="admin-count">PLAYERS LOADED: {snap.totalParticipants}</span>
          </div>
          {truncated && (
            <p className="admin-warning">
              최대 {MAX_PARTICIPANTS}명까지만 적용됩니다. 초과된 인원은 제외되었습니다.
            </p>
          )}
          {duplicates.length > 0 && (
            <p className="admin-warning">중복된 이름 {duplicates.length}건: {duplicates.join(", ")}</p>
          )}
        </section>

        <section className="admin-section admin-controls">
          <h2>진행 제어</h2>
          <div className="admin-row">
            <button type="button" onClick={() => engine.start()} disabled={snap.totalParticipants === 0}>
              시작
            </button>
            <button type="button" onClick={() => engine.togglePause()}>
              {snap.phase === "paused" ? "재생 (Space)" : "일시정지 (Space)"}
            </button>
            <button type="button" onClick={() => engine.instantDrop()}>
              즉시 낙하 (N)
            </button>
            <button type="button" onClick={() => engine.reset()}>
              초기화 후 재시작 (R)
            </button>
          </div>

          <label className="admin-slider">
            낙하 속도: {snap.settings.dropRowsPerSecond.toFixed(1)} rows/s
            <input
              type="range"
              min={1}
              max={12}
              step={0.5}
              value={snap.settings.dropRowsPerSecond}
              onChange={(e) => engine.setDropSpeed(Number(e.target.value))}
            />
          </label>

          <label className="admin-slider">
            참가자 등장 간격: {snap.settings.spawnIntervalMs}ms
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={snap.settings.spawnIntervalMs}
              onChange={(e) => engine.setSpawnInterval(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="admin-section">
          <h2>행사 로고</h2>
          <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleLogoUpload} />
          {logoName && <p className="admin-hint">업로드됨: {logoName}</p>}
        </section>

        <section className="admin-section">
          <h2>화면</h2>
          <button type="button" onClick={handleFullscreen}>
            전체화면 (F)
          </button>
        </section>

        <section className="admin-section admin-danger">
          <h2>게임 종료</h2>
          <button type="button" className={confirmEnd ? "admin-end-confirm" : "admin-end"} onClick={handleEndClick}>
            {confirmEnd ? "정말 종료할까요? 다시 클릭하세요" : "게임 종료 및 피날레 실행"}
          </button>
          <p className="admin-hint">또는 Enter 키를 2초 이상 길게 누르면 바로 종료됩니다.</p>
        </section>

        <section className="admin-section admin-shortcuts">
          <h2>단축키</h2>
          <ul>
            <li>Space : 일시정지 / 재생</li>
            <li>N : 현재 블록 즉시 착지</li>
            <li>R : 게임 초기화 후 다시 시작</li>
            <li>F : 전체화면</li>
            <li>Enter (2초 길게) : 게임 종료 및 피날레 실행</li>
            <li>Esc : 관리자 화면 열기 / 닫기</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
