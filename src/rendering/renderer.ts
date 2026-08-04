import type { GameSnapshot } from "../types/game";
import { BOARD_COLS, BOARD_ROWS } from "../game/board";
import { getShapeCells } from "../game/tetrominoes";
import { getPieceVisualState, FINALE_DURATIONS, CLEAR_ANIMATION_MS } from "../game/gameLoop";
import { drawCell, TETROMINO_PALETTE } from "./blockRenderer";
import { ParticleSystem } from "./particleSystem";
import { ScreenShake, FlashEffect, drawBackground } from "./effects";

export interface BoardLayout {
  cellSize: number;
  originX: number;
  originY: number;
  boardW: number;
  boardH: number;
}

/** The canvas now only fills the board's own panel, so it can use nearly all of it. */
export function computeBoardLayout(width: number, height: number): BoardLayout {
  const maxByHeight = (height * 0.97) / BOARD_ROWS;
  const maxByWidth = (width * 0.96) / BOARD_COLS;
  const cellSize = Math.max(10, Math.floor(Math.min(maxByHeight, maxByWidth)));
  const boardW = cellSize * BOARD_COLS;
  const boardH = cellSize * BOARD_ROWS;
  return {
    cellSize,
    originX: (width - boardW) / 2,
    originY: (height - boardH) / 2,
    boardW,
    boardH,
  };
}

export class GameRenderer {
  particles = new ParticleSystem();
  shake = new ScreenShake();
  flash = new FlashEffect();

  private lastClock: number | null = null;
  private prevLandingAt: number | null = null;
  private prevClearingAt: number | null = null;
  private prevFinaleStep: string | null = null;

  reset(): void {
    this.particles.clear();
    this.shake.intensity = 0;
    this.flash.alpha = 0;
    this.lastClock = null;
    this.prevLandingAt = null;
    this.prevClearingAt = null;
    this.prevFinaleStep = null;
  }

  private cellCenter(layout: BoardLayout, col: number, row: number): { x: number; y: number } {
    return {
      x: layout.originX + col * layout.cellSize + layout.cellSize / 2,
      y: layout.originY + row * layout.cellSize + layout.cellSize / 2,
    };
  }

  private handleEvents(snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    if (snapshot.lastLanding && snapshot.lastLanding.at !== this.prevLandingAt) {
      this.prevLandingAt = snapshot.lastLanding.at;
      const { x, y } = this.cellCenter(layout, snapshot.lastLanding.col + 1.5, snapshot.lastLanding.row + 1);
      this.particles.spawnCellBurst(x - layout.cellSize / 2, y - layout.cellSize / 2, layout.cellSize, "#f4f4e8", 10);
      this.shake.trigger(2.5);
    }

    if (
      snapshot.clearingStartedAt !== null &&
      snapshot.clearingStartedAt !== this.prevClearingAt &&
      snapshot.clearingRows.length > 0
    ) {
      this.prevClearingAt = snapshot.clearingStartedAt;
      for (const row of snapshot.clearingRows) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const cell = snapshot.board[row]?.[col];
          if (!cell) continue;
          const px = layout.originX + col * layout.cellSize;
          const py = layout.originY + row * layout.cellSize;
          this.particles.spawnCellBurst(px, py, layout.cellSize, "#ffc400", 5);
        }
      }
      this.shake.trigger(3 + snapshot.clearingRows.length * 1.5);
      this.flash.trigger(0.1 + snapshot.clearingRows.length * 0.06);
    }

    // The board's own destruction is handled by the full-viewport
    // BattleParticleField (components/BattleTransition/BattleParticleField.tsx),
    // which spawns particles from each cell's *real on-screen* position -
    // including the left/right DOM panels, which this board-scoped canvas
    // can't reach. This renderer only keeps the beats that are inherently
    // board-shaped and happen before the board disappears.
    if (snapshot.finaleStep !== this.prevFinaleStep) {
      const entering = snapshot.finaleStep;
      this.prevFinaleStep = entering;
      if (entering === "playersReady") {
        this.shake.trigger(5);
      }
    }

    // Rising sparks during the energy-charge beat.
    if (snapshot.finaleStep === "charging") {
      const stepElapsed = clock - snapshot.finaleStepStartedAt;
      if (stepElapsed < FINALE_DURATIONS.charging && Math.random() < 0.55) {
        const col = Math.random() * BOARD_COLS;
        const row = BOARD_ROWS - 1 - Math.random() * 6;
        const { x, y } = this.cellCenter(layout, col, row);
        const colors = Object.values(TETROMINO_PALETTE).map((p) => p.light);
        this.particles.spawnRising(x, y, colors[Math.floor(Math.random() * colors.length)]);
      }
    }
  }

  private drawBoard(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    const { cellSize, originX, originY } = layout;

    ctx.save();
    ctx.strokeStyle = "#4e4e4e";
    ctx.lineWidth = 2;
    ctx.strokeRect(originX - 3, originY - 3, layout.boardW + 6, layout.boardH + 6);
    ctx.fillStyle = "#050505";
    ctx.fillRect(originX, originY, layout.boardW, layout.boardH);

    // Barely-there grid, per spec ("almost invisible").
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < BOARD_COLS; c++) {
      const x = originX + c * cellSize;
      ctx.moveTo(x, originY);
      ctx.lineTo(x, originY + layout.boardH);
    }
    for (let r = 1; r < BOARD_ROWS; r++) {
      const y = originY + r * cellSize;
      ctx.moveTo(originX, y);
      ctx.lineTo(originX + layout.boardW, y);
    }
    ctx.stroke();
    ctx.restore();

    const clearingSet = new Set(snapshot.clearingRows);
    const clearProgress =
      snapshot.clearingStartedAt !== null ? (clock - snapshot.clearingStartedAt) / CLEAR_ANIMATION_MS : 0;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const cell = snapshot.board[row]?.[col];
        if (!cell) continue;
        const x = originX + col * cellSize;
        const y = originY + row * cellSize;
        const isClearing = clearingSet.has(row);
        if (isClearing) {
          const wipe = clamp((clearProgress * (BOARD_COLS + 2) - col) / 2, 0, 1);
          drawCell(ctx, x, y, cellSize, cell.colorIndex, cell.char, cell.isEmpty, {
            whiteFlash: wipe * (1 - clearProgress * 0.3),
          });
        } else {
          drawCell(ctx, x, y, cellSize, cell.colorIndex, cell.char, cell.isEmpty);
        }
      }
    }

    if (snapshot.activePiece) {
      const piece = snapshot.activePiece;
      const visual = getPieceVisualState(piece, clock);
      const shape = getShapeCells(piece.type, visual.rotation);
      shape.forEach(([dx, dy], index) => {
        const col = visual.x + dx;
        const row = visual.y + dy;
        if (row < -SHAPE_MARGIN) return;
        const x = originX + col * cellSize;
        const y = originY + row * cellSize;
        const cellDef = piece.cells[index];
        drawCell(ctx, x, y, cellSize, piece.colorIndex, cellDef.char, cellDef.isEmpty, { active: true });
      });
    }
  }

  /**
   * Energy overlay drawn on top of the (still fully visible) board during
   * charging: a bottom-to-top brightness wave riding a 2-pulse sweep. Board
   * contents stay legible - this reads as "powering up", never a wipe/dim.
   */
  private drawBoardEnergyWave(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout, stepElapsed: number, durationMs: number, passes: number): void {
    const passLenMs = durationMs / passes;
    const sweepT = (stepElapsed % passLenMs) / passLenMs;
    for (let row = 0; row < BOARD_ROWS; row++) {
      const rowFromBottom = BOARD_ROWS - 1 - row;
      const wave = sweepT * (BOARD_ROWS + 6) - rowFromBottom;
      if (wave < 0 || wave > 6) continue;
      const intensity = 1 - Math.abs(wave - 3) / 3;
      for (let col = 0; col < BOARD_COLS; col++) {
        const cell = snapshot.board[row]?.[col];
        if (!cell) continue;
        const x = layout.originX + col * layout.cellSize;
        const y = layout.originY + row * layout.cellSize;
        drawCell(ctx, x, y, layout.cellSize, cell.colorIndex, cell.char, cell.isEmpty, {
          active: true,
          whiteFlash: intensity * 0.3,
        });
      }
    }
  }

  private drawFinale(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    if (snapshot.finaleStep === "none") return;
    const stepElapsed = clock - snapshot.finaleStepStartedAt;

    if (snapshot.finaleStep === "playersReady") {
      // Board outline lights up bottom-to-top in sync with the DOM
      // "ALL PLAYERS READY" typography (components/BattleTransition).
      const dur = FINALE_DURATIONS.playersReady;
      const progress = clamp(stepElapsed / dur, 0, 1);
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        const rowFromBottom = BOARD_ROWS - 1 - row;
        const wave = progress * (BOARD_ROWS + 6) - rowFromBottom;
        if (wave < 0 || wave > 5) continue;
        for (let col = 0; col < BOARD_COLS; col++) {
          const cell = snapshot.board[row]?.[col];
          if (!cell) continue;
          const x = layout.originX + col * layout.cellSize;
          const y = layout.originY + row * layout.cellSize;
          drawCell(ctx, x, y, layout.cellSize, cell.colorIndex, cell.char, cell.isEmpty, { active: true });
        }
      }
    }

    if (snapshot.finaleStep === "charging") {
      const dur = FINALE_DURATIONS.charging;
      this.drawBoardEnergyWave(ctx, snapshot, layout, stepElapsed, dur, 2);

      // 2-3 pixel shockwave rings expanding from board center.
      const cx = layout.originX + layout.boardW / 2;
      const cy = layout.originY + layout.boardH / 2;
      const ringCount = 3;
      const ringLife = 520;
      const maxRadius = Math.max(layout.boardW, layout.boardH) * 0.62;
      ctx.save();
      for (let i = 0; i < ringCount; i++) {
        const ringElapsed = stepElapsed - i * (dur / ringCount);
        if (ringElapsed < 0 || ringElapsed > ringLife) continue;
        const ringT = ringElapsed / ringLife;
        const radius = Math.round(ringT * maxRadius);
        ctx.globalAlpha = (1 - ringT) * 0.5;
        ctx.strokeStyle = "#f4f4e8";
        ctx.lineWidth = Math.max(1, layout.cellSize * 0.12);
        ctx.strokeRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }
      ctx.restore();
    }

  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: GameSnapshot, clock: number): void {
    const dt = this.lastClock === null ? 16 : clock - this.lastClock;
    this.lastClock = clock;

    const layout = computeBoardLayout(width, height);
    this.handleEvents(snapshot, layout, clock);
    this.particles.update(dt);
    this.shake.update(dt);
    this.flash.update(dt);

    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height, clock);

    const shakeOffset = this.shake.getOffset();
    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);

    // Board stays fully visible and legible through playersReady/charging
    // (per spec: never a wipe or dim-out before the burst). READY? and the
    // burst/key-visual/battle-text beats live in the full-viewport overlay
    // (components/BattleTransition) which captures this board's real cell
    // positions right as the burst starts, then this canvas goes quiet.
    const hideBoard =
      snapshot.finaleStep === "burst" ||
      snapshot.finaleStep === "keyVisualAssembly" ||
      snapshot.finaleStep === "battleTextReveal";
    if (!hideBoard) {
      this.drawBoard(ctx, snapshot, layout, clock);
    }

    this.particles.draw(ctx);
    this.drawFinale(ctx, snapshot, layout, clock);

    if (this.flash.alpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash.alpha})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
}

const SHAPE_MARGIN = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
