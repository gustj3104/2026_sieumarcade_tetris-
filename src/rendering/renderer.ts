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

export function computeBoardLayout(width: number, height: number): BoardLayout {
  const maxByHeight = (height * 0.94) / BOARD_ROWS;
  const maxByWidth = (width * 0.62) / BOARD_COLS;
  const cellSize = Math.max(12, Math.floor(Math.min(maxByHeight, maxByWidth)));
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
      this.particles.spawnCellBurst(x - layout.cellSize / 2, y - layout.cellSize / 2, layout.cellSize, "#ffffff", 14);
      this.shake.trigger(3.5);
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
          const palette = TETROMINO_PALETTE[cell.colorIndex] ?? TETROMINO_PALETTE[0];
          this.particles.spawnCellBurst(px, py, layout.cellSize, palette.glow, 6);
        }
      }
      this.shake.trigger(4 + snapshot.clearingRows.length * 2.5);
      this.flash.trigger(0.12 + snapshot.clearingRows.length * 0.08);
    }

    if (snapshot.finaleStep !== this.prevFinaleStep) {
      const entering = snapshot.finaleStep;
      this.prevFinaleStep = entering;
      if (entering === "flash") {
        this.flash.trigger(0.85);
        this.shake.trigger(10);
      } else if (entering === "explode") {
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const cell = snapshot.board[row]?.[col];
            if (!cell) continue;
            const { x, y } = this.cellCenter(layout, col, row);
            const palette = TETROMINO_PALETTE[cell.colorIndex] ?? TETROMINO_PALETTE[0];
            this.particles.spawnRadialBurst(x, y, palette.glow, 5, 220);
          }
        }
        this.shake.trigger(8);
      } else if (entering === "gather") {
        const cx = layout.originX + layout.boardW / 2;
        const cy = layout.originY + layout.boardH / 2;
        const colors = Object.values(TETROMINO_PALETTE).map((p) => p.glow);
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
    ctx.strokeStyle = "rgba(140,170,255,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(originX - 3, originY - 3, layout.boardW + 6, layout.boardH + 6);
    ctx.fillStyle = "rgba(6,10,26,0.55)";
    ctx.fillRect(originX, originY, layout.boardW, layout.boardH);
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
          const glow = 6 + wipe * (cellSize * 0.6);
          ctx.save();
          ctx.globalAlpha = 1 - clearProgress * 0.4;
          drawCell(ctx, x, y, cellSize, cell.colorIndex, cell.char, cell.isEmpty, {
            glow,
            extraGlow: "#ffffff",
          });
          ctx.restore();
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
        drawCell(ctx, x, y, cellSize, piece.colorIndex, cellDef.char, cellDef.isEmpty, { glow: cellSize * 0.22 });
      });
    }
  }

  private drawLandingBanner(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    if (!snapshot.lastLanding) return;
    const elapsed = clock - snapshot.lastLanding.at;
    const durationMs = 850;
    if (elapsed < 0 || elapsed > durationMs) return;
    const t = elapsed / durationMs;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;

    const bannerY = layout.originY + layout.cellSize * 1.6;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.92;
    ctx.fillStyle = "rgba(4,8,20,0.72)";
    const w = layout.boardW * 0.94;
    const h = layout.cellSize * 2.1;
    const x = layout.originX + (layout.boardW - w) / 2;
    ctx.fillRect(x, bannerY, w, h);
    ctx.strokeStyle = "rgba(120,200,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, bannerY, w, h);

    ctx.textAlign = "center";
    ctx.fillStyle = "#7fe9ff";
    ctx.font = `700 ${layout.cellSize * 0.42}px "Consolas", monospace`;
    ctx.fillText("PLAYER CONNECTED", x + w / 2, bannerY + h * 0.38);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${layout.cellSize * 0.6}px "Malgun Gothic", sans-serif`;
    ctx.fillText(snapshot.lastLanding.participant.name, x + w / 2, bannerY + h * 0.76);
    ctx.restore();
  }

  private drawFinale(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: GameSnapshot, layout: BoardLayout, clock: number): void {
    if (snapshot.finaleStep === "none") return;
    const stepElapsed = clock - snapshot.finaleStepStartedAt;

    const dimAlpha = snapshot.finaleStep === "dim" ? clamp(stepElapsed / FINALE_DURATIONS.dim, 0, 1) * 0.6 : 0.6;
    ctx.save();
    ctx.fillStyle = `rgba(2,4,12,${dimAlpha})`;
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
          drawCell(ctx, x, y, layout.cellSize, cell.colorIndex, cell.char, cell.isEmpty, {
            glow: layout.cellSize * 0.7,
            extraGlow: "#ffffff",
          });
        }
      }
    }

    if (snapshot.finaleStep === "title") {
      const t = clamp(stepElapsed / FINALE_DURATIONS.title, 0, 1);
      const alpha = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.textAlign = "center";
      ctx.fillStyle = "#eaf6ff";
      ctx.shadowColor = "#5ad6ff";
      ctx.shadowBlur = 26;
      ctx.font = `800 ${Math.max(28, width * 0.045)}px "Consolas", "Malgun Gothic", monospace`;
      ctx.fillText("ALL PLAYERS READY", width / 2, height * 0.42);
      ctx.restore();
    }

    if (snapshot.finaleStep === "logo") {
      const t = clamp(stepElapsed / FINALE_DURATIONS.logo, 0, 1);
      const alpha = clamp(t / 0.4, 0, 1);
      const scale = 0.9 + Math.min(t / 0.6, 1) * 0.1;
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const glow = 30 + Math.sin(clock / 180) * 12;
      const img = snapshot.logoUrl ? getLogoImage(snapshot.logoUrl) : null;
      if (img) {
        ctx.shadowColor = "#7fe9ff";
        ctx.shadowBlur = glow;
        const maxW = width * 0.4;
        const maxH = height * 0.3;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.shadowColor = "#7fe9ff";
        ctx.shadowBlur = glow;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${Math.max(30, width * 0.05)}px "Consolas", monospace`;
        ctx.fillText("SIEUMCLUB", 0, -8);
        ctx.font = `700 ${Math.max(14, width * 0.02)}px "Consolas", monospace`;
        ctx.fillStyle = "#9fdfff";
        ctx.fillText("LIVE BAND BATTLE", 0, Math.max(24, width * 0.032));
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
      if (snapshot.phase === "playing") this.drawLandingBanner(ctx, snapshot, layout, clock);
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
