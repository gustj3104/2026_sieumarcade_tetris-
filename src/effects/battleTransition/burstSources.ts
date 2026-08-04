import type { GameSnapshot } from "../../types/game";
import { BOARD_COLS, BOARD_ROWS } from "../../game/board";
import { computeBoardLayout } from "../../rendering/renderer";
import { TETROMINO_PALETTE } from "../../rendering/blockRenderer";
import type { BattleParticleSystem } from "./battleParticles";

const PALETTE_COLORS = Object.values(TETROMINO_PALETTE).map((p) => p.light);
const WHITE = "#f4f4e8";
const ORANGE = "#f28c00";
const YELLOW = "#ffc400";
const CYAN = "#18bfe8";
const BRICK = "#bcbcbc";

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

/** Scatters `count` fragments across an element's real on-screen rect, in every direction. */
function burstRect(
  system: BattleParticleSystem,
  rect: DOMRect,
  count: number,
  colors: string[],
  type: "blockPixel" | "brick" | "textPixel" | "star" | "streak",
  opts: { speed?: [number, number]; size?: [number, number]; life?: [number, number]; delay?: number; biasAngle?: number; biasSpread?: number } = {},
): void {
  if (rect.width <= 0 || rect.height <= 0) return;
  const [speedMin, speedMax] = opts.speed ?? [160, 420];
  const [sizeMin, sizeMax] = opts.size ?? [4, 10];
  const [lifeMin, lifeMax] = opts.life ?? [650, 1100];
  system.spawnBatch(count, (i) => {
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    const angle =
      opts.biasAngle !== undefined
        ? opts.biasAngle + (Math.random() - 0.5) * (opts.biasSpread ?? Math.PI * 0.6)
        : randomAngle();
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    return {
      type,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      color: pick(colors, i),
      lifetime: lifeMin + Math.random() * (lifeMax - lifeMin),
      delay: (opts.delay ?? 0) + Math.random() * 60,
    };
  });
}

function queryRects(root: ParentNode, selector: string): DOMRect[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).map((el) => el.getBoundingClientRect());
}

/**
 * Fires the entire screen-wide burst: the real game board's filled cells
 * (sourced from the live board canvas + engine snapshot) and every left/
 * right panel unit (sourced from their actual DOM rects via data-bt-unit
 * attributes), each becoming typed, colored BattleParticles that fly
 * outward from the exact spot the thing they represent was standing.
 */
export function triggerBattleBurst(system: BattleParticleSystem, snapshot: GameSnapshot, boardCanvas: HTMLCanvasElement | null): void {
  // --- Center game board: every filled cell detonates from its own spot. ---
  if (boardCanvas) {
    const canvasRect = boardCanvas.getBoundingClientRect();
    const layout = computeBoardLayout(canvasRect.width, canvasRect.height);
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const cell = snapshot.board[row]?.[col];
        if (!cell) continue;
        const cx = canvasRect.left + layout.originX + col * layout.cellSize + layout.cellSize / 2;
        const cy = canvasRect.top + layout.originY + row * layout.cellSize + layout.cellSize / 2;
        const palette = TETROMINO_PALETTE[cell.colorIndex] ?? TETROMINO_PALETTE[0];
        system.spawnBatch(4, () => {
          const angle = randomAngle();
          const speed = 220 + Math.random() * 480;
          return {
            type: Math.random() < 0.7 ? "blockPixel" : "textPixel",
            x: cx + (Math.random() - 0.5) * layout.cellSize,
            y: cy + (Math.random() - 0.5) * layout.cellSize,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: layout.cellSize * (0.22 + Math.random() * 0.22),
            color: palette.light,
            lifetime: 700 + Math.random() * 550,
            delay: Math.random() * 90,
          };
        });
      }
    }
    // Board frame splits into four corners and is pushed off-screen.
    const frameRect = new DOMRect(
      canvasRect.left + layout.originX,
      canvasRect.top + layout.originY,
      layout.boardW,
      layout.boardH,
    );
    const corners: Array<[number, number, number]> = [
      [frameRect.left, frameRect.top, Math.PI * 1.25],
      [frameRect.right, frameRect.top, Math.PI * 1.75],
      [frameRect.left, frameRect.bottom, Math.PI * 0.75],
      [frameRect.right, frameRect.bottom, Math.PI * 0.25],
    ];
    for (const [x, y, angle] of corners) {
      system.spawnBatch(10, () => ({
        type: "brick",
        x,
        y,
        vx: Math.cos(angle) * (260 + Math.random() * 260),
        vy: Math.sin(angle) * (260 + Math.random() * 260),
        size: 10 + Math.random() * 10,
        color: BRICK,
        lifetime: 750 + Math.random() * 400,
        delay: Math.random() * 80,
      }));
    }
  }

  // --- Left panel: BATTLE ENTRY, NEXT queue, PLAYER card - flung up/down-left. ---
  for (const rect of queryRects(document, '[data-bt-unit="battle-entry"]')) {
    burstRect(system, rect, 12, [ORANGE, WHITE], "textPixel", { biasAngle: Math.PI * 1.2, biasSpread: 1.1, delay: 0 });
  }
  queryRects(document, '[data-bt-unit="next-item"]').forEach((rect, i) => {
    const biasAngle = i % 2 === 0 ? Math.PI * 1.25 : Math.PI * 0.85;
    burstRect(system, rect, 8, [pick(PALETTE_COLORS, i), pick(PALETTE_COLORS, i + 2)], "blockPixel", {
      biasAngle,
      biasSpread: 0.9,
      delay: 70 + i * 20,
      speed: [200, 460],
    });
  });
  for (const rect of queryRects(document, '[data-bt-unit="player-name"]')) {
    burstRect(system, rect, 10, [ORANGE, WHITE], "textPixel", { biasAngle: Math.PI * 1.5, biasSpread: 1.4, delay: 140 });
  }
  for (const rect of queryRects(document, '[data-bt-unit="player-heart"]')) {
    burstRect(system, rect, 4, ["#ff5a6a", WHITE], "star", { biasAngle: Math.PI * 1.5, biasSpread: 1.4, delay: 140, speed: [120, 260] });
  }
  for (const rect of queryRects(document, '[data-bt-unit="left-frame"]')) {
    burstRect(system, rect, 14, [BRICK, "#777777"], "brick", { biasAngle: Math.PI, biasSpread: 1.6, delay: 20, size: [8, 16] });
  }

  // --- Right panel: STATS, NEXT PLAYERS, KEY GUIDE - flung up/down-right. ---
  for (const rect of queryRects(document, '[data-bt-unit="stats-row"]')) {
    burstRect(system, rect, 10, [YELLOW, WHITE, ORANGE], "textPixel", { biasAngle: Math.PI * -0.2, biasSpread: 1.1, delay: 40 });
  }
  queryRects(document, '[data-bt-unit="next-players-row"]').forEach((rect, i) => {
    burstRect(system, rect, 6, [pick(PALETTE_COLORS, i + 1)], "streak", {
      biasAngle: Math.PI * -0.2,
      biasSpread: 0.9,
      delay: 110 + i * 20,
      speed: [260, 520],
    });
  });
  for (const rect of queryRects(document, '[data-bt-unit="key-guide-row"]')) {
    burstRect(system, rect, 6, [WHITE, CYAN], "brick", { biasAngle: Math.PI * -0.1, biasSpread: 1.0, delay: 180, size: [6, 12] });
  }
  for (const rect of queryRects(document, '[data-bt-unit="right-frame"]')) {
    burstRect(system, rect, 14, [BRICK, "#777777"], "brick", { biasAngle: 0, biasSpread: 1.6, delay: 20, size: [8, 16] });
  }

  // --- Header: rainbow + star decorations scatter; wordmark itself is CSS-shrunk, not exploded. ---
  for (const rect of queryRects(document, '[data-bt-unit="header-deco"]')) {
    burstRect(system, rect, 16, [YELLOW, ORANGE, CYAN, WHITE], "star", { biasAngle: -Math.PI / 2, biasSpread: 1.6, delay: 10, speed: [180, 380] });
  }
}
