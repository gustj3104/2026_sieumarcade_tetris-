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

/** Flat pixel text: solid fill plus a hard 1-step offset shadow instead of shadowBlur. */
function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  color: string,
  font = '"Press Start 2P", "Consolas", monospace',
): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${fontPx}px ${font}`;
  const offset = Math.max(2, fontPx * 0.07);
  ctx.fillStyle = "#000000";
  ctx.fillText(text, x + offset, y + offset);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export class GameRenderer {
  particles = new ParticleSystem();
  shake = new ScreenShake();
  flash = new FlashEffect();

  private lastClock: number | null = null;
  private prevLandingAt: number | null = null;
  private prevClearingAt: number | null = null;
  private prevFinaleStep: string | null = null;
  /** Next scheduled ambient sparkle burst during the persisted battle-open hold. */
  private nextAmbientSparkleAt: number | null = null;

  reset(): void {
    this.particles.clear();
    this.shake.intensity = 0;
    this.flash.alpha = 0;
    this.lastClock = null;
    this.prevLandingAt = null;
    this.prevClearingAt = null;
    this.prevFinaleStep = null;
    this.nextAmbientSparkleAt = null;
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

    if (snapshot.finaleStep !== this.prevFinaleStep) {
      const entering = snapshot.finaleStep;
      this.prevFinaleStep = entering;

      if (entering === "readyPrompt") {
        // Big flash + a ring of square pixels around the READY? text.
        this.flash.trigger(0.75);
        this.shake.trigger(4);
        const cx = layout.originX + layout.boardW / 2;
        const cy = layout.originY + layout.boardH * 0.42;
        this.particles.spawnRadialBurst(cx, cy, "#fff6df", 40, 260);
      } else if (entering === "burst") {
        // Every landed name-block detonates outward in all directions at once.
        this.flash.trigger(0.95);
        this.shake.trigger(10);
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const cell = snapshot.board[row]?.[col];
            if (!cell) continue;
            const { x, y } = this.cellCenter(layout, col, row);
            const palette = TETROMINO_PALETTE[cell.colorIndex] ?? TETROMINO_PALETTE[0];
            this.particles.spawnRadialBurst(x, y, palette.light, 6, 260);
          }
        }
      } else if (entering === "keyVisualReveal") {
        // Scattered pixels rush back in toward center to seed the key-visual reveal.
        const cx = layout.originX + layout.boardW / 2;
        const cy = layout.originY + layout.boardH / 2;
        const colors = Object.values(TETROMINO_PALETTE).map((p) => p.light);
        for (let i = 0; i < 90; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.max(layout.boardW, layout.boardH) * (0.5 + Math.random() * 0.5);
          const fromX = cx + Math.cos(angle) * dist;
          const fromY = cy + Math.sin(angle) * dist;
          this.particles.spawnGather(fromX, fromY, cx, cy, colors[i % colors.length]);
        }
        this.flash.trigger(0.5);
        this.nextAmbientSparkleAt = snapshot.finaleStepStartedAt + FINALE_DURATIONS.keyVisualReveal + 3000;
      }
    }

    // Rising sparks + shockwave rings during the energy-charge beat.
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

    // A small recurring sparkle, roughly every 4-6s, while the battle-open hold screen is up.
    if (snapshot.finaleStep === "keyVisualReveal" && this.nextAmbientSparkleAt !== null && clock >= this.nextAmbientSparkleAt) {
      const cx = layout.originX + layout.boardW * (0.15 + Math.random() * 0.7);
      const cy = layout.originY + layout.boardH * (0.15 + Math.random() * 0.7);
      const colors = Object.values(TETROMINO_PALETTE).map((p) => p.light);
      this.particles.spawnRadialBurst(cx, cy, colors[Math.floor(Math.random() * colors.length)], 14, 120);
      this.nextAmbientSparkleAt = clock + 4000 + Math.random() * 2000;
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
   * allPlayersReady/charging: a bottom-to-top brightness wave plus a thin
   * bright outline riding the same wave. Board contents stay legible - this
   * is meant to read as "powering up", never as a wipe or a dim-out.
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

  private drawFinale(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    if (snapshot.finaleStep === "none") return;
    const stepElapsed = clock - snapshot.finaleStepStartedAt;

    if (snapshot.finaleStep === "allPlayersReady") {
      const dur = FINALE_DURATIONS.allPlayersReady;
      this.drawBoardEnergyWave(ctx, snapshot, layout, stepElapsed, dur, 1);

      const t = clamp(stepElapsed / dur, 0, 1);
      let color = "#f4f4e8";
      if (t < 0.18) color = "#ffc400";
      else if (t < 0.36) color = "#f28c00";
      const scaleT = clamp(stepElapsed / 280, 0, 1);
      const scale = scaleT < 0.5 ? 0.95 + 0.1 * (scaleT / 0.5) : 1.05 - 0.05 * ((scaleT - 0.5) / 0.5);
      // 2-3 frame glitch jitter right at entry.
      const jitterX = stepElapsed < 120 ? (Math.floor(stepElapsed / 35) % 2 === 0 ? 3 : -3) : 0;

      ctx.save();
      ctx.translate(width / 2 + jitterX, height * 0.4);
      ctx.scale(scale, scale);
      drawPixelText(ctx, "ALL PLAYERS READY", 0, 0, Math.max(16, width * 0.026), color);
      ctx.restore();
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

    if (snapshot.finaleStep === "readyPrompt") {
      const dur = FINALE_DURATIONS.readyPrompt;
      const t = clamp(stepElapsed / dur, 0, 1);
      const scale = t < 0.4 ? 0.8 + 0.35 * (t / 0.4) : t < 0.65 ? 1.15 - 0.15 * ((t - 0.4) / 0.25) : 1;
      ctx.save();
      ctx.translate(width / 2, height * 0.46);
      ctx.scale(scale, scale);
      drawPixelText(ctx, "READY?", 0, 0, Math.max(28, width * 0.07), "#fff6df");
      ctx.restore();
    }

    if (snapshot.finaleStep === "burst") {
      // Brief dark-navy pre-flash (<=120ms) right before the bright detonation.
      if (stepElapsed < 120) {
        ctx.save();
        ctx.fillStyle = `rgba(4,6,20,${(1 - stepElapsed / 120) * 0.55})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      // The board frame itself gets pushed outward and fades away.
      const frameT = clamp(stepElapsed / 550, 0, 1);
      if (frameT < 1) {
        const grow = frameT * layout.cellSize * 5;
        ctx.save();
        ctx.globalAlpha = 1 - frameT;
        ctx.strokeStyle = "#f4f4e8";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          layout.originX - 3 - grow,
          layout.originY - 3 - grow,
          layout.boardW + 6 + grow * 2,
          layout.boardH + 6 + grow * 2,
        );
        ctx.restore();
      }
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

    // Board stays fully visible and legible through allPlayersReady/charging/
    // readyPrompt (per spec: never a wipe or dim-out before the burst). Only
    // burst and beyond hide it - the particle explosion carries the visual,
    // then the DOM key-visual overlay takes over for the persisted hold.
    const hideBoard = snapshot.finaleStep === "burst" || snapshot.finaleStep === "keyVisualReveal";
    if (!hideBoard) {
      this.drawBoard(ctx, snapshot, layout, clock);
    }

    this.particles.draw(ctx);
    this.drawFinale(ctx, width, height, snapshot, layout, clock);

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
