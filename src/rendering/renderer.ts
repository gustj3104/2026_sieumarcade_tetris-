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

const logoImageCache = new Map<string, HTMLImageElement>();

function getLogoImage(url: string): HTMLImageElement | null {
  let img = logoImageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    logoImageCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
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

  private handleEvents(snapshot: GameSnapshot, layout: BoardLayout): void {
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
      if (entering === "flash") {
        this.flash.trigger(0.85);
        this.shake.trigger(8);
      } else if (entering === "explode") {
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const cell = snapshot.board[row]?.[col];
            if (!cell) continue;
            const { x, y } = this.cellCenter(layout, col, row);
            const palette = TETROMINO_PALETTE[cell.colorIndex] ?? TETROMINO_PALETTE[0];
            this.particles.spawnRadialBurst(x, y, palette.light, 5, 210);
          }
        }
        this.shake.trigger(6);
      } else if (entering === "gather") {
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

  private drawFinale(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    if (snapshot.finaleStep === "none") return;
    const stepElapsed = clock - snapshot.finaleStepStartedAt;

    const dimAlpha = snapshot.finaleStep === "dim" ? clamp(stepElapsed / FINALE_DURATIONS.dim, 0, 1) * 0.7 : 0.7;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${dimAlpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if (snapshot.finaleStep === "outline") {
      const progress = clamp(stepElapsed / FINALE_DURATIONS.outline, 0, 1);
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const cell = snapshot.board[row]?.[col];
          if (!cell) continue;
          const wave = progress * (BOARD_COLS + 6) - col;
          if (wave < 0 || wave > 5) continue;
          const x = layout.originX + col * layout.cellSize;
          const y = layout.originY + row * layout.cellSize;
          drawCell(ctx, x, y, layout.cellSize, cell.colorIndex, cell.char, cell.isEmpty, { active: true });
        }
      }
    }

    if (snapshot.finaleStep === "title") {
      const t = clamp(stepElapsed / FINALE_DURATIONS.title, 0, 1);
      const alpha = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      drawPixelText(ctx, "ALL PLAYERS READY", width / 2, height * 0.42, Math.max(16, width * 0.026), "#ffc400");
      ctx.restore();
    }

    if (snapshot.finaleStep === "logo") {
      const t = clamp(stepElapsed / FINALE_DURATIONS.logo, 0, 1);
      const alpha = clamp(t / 0.4, 0, 1);
      const scale = 0.92 + Math.min(t / 0.6, 1) * 0.08;
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const img = snapshot.logoUrl ? getLogoImage(snapshot.logoUrl) : null;
      if (img) {
        const maxW = width * 0.4;
        const maxH = height * 0.3;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        drawPixelText(ctx, "SIEUMARCADE", 0, -8, Math.max(18, width * 0.032), "#f28c00");
        drawPixelText(ctx, "[ LIVE BAND BATTLE ]", 0, Math.max(24, width * 0.032), Math.max(10, width * 0.014), "#18bfe8");
      }
      ctx.restore();
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: GameSnapshot, clock: number): void {
    const dt = this.lastClock === null ? 16 : clock - this.lastClock;
    this.lastClock = clock;

    const layout = computeBoardLayout(width, height);
    this.handleEvents(snapshot, layout);
    this.particles.update(dt);
    this.shake.update(dt);
    this.flash.update(dt);

    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height, clock);

    const shakeOffset = this.shake.getOffset();
    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);

    const hideBoard = snapshot.finaleStep === "explode" || snapshot.finaleStep === "gather" || snapshot.finaleStep === "logo";
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
