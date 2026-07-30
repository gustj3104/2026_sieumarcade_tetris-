export interface CellPalette {
  base: string;
  light: string;
  dark: string;
  glow: string;
}

/** colorIndex -> palette, matching TETROMINO_COLORS in game/tetrominoes.ts (I,O,T,L,J,S,Z). */
export const TETROMINO_PALETTE: Record<number, CellPalette> = {
  0: { base: "#00b7d6", light: "#8ef3ff", dark: "#053f4d", glow: "#00e5ff" },
  1: { base: "#d6ad00", light: "#ffe988", dark: "#4d3c00", glow: "#ffd400" },
  2: { base: "#9330cf", light: "#dcabff", dark: "#3a1152", glow: "#c268ff" },
  3: { base: "#d97614", light: "#ffc07a", dark: "#4d2900", glow: "#ff9433" },
  4: { base: "#2f66d6", light: "#a3c3ff", dark: "#122a52", glow: "#5b93ff" },
  5: { base: "#2fb056", light: "#a3f5bd", dark: "#0f3d1f", glow: "#57ff81" },
  6: { base: "#d63a51", light: "#ff9daa", dark: "#4d1119", glow: "#ff5468" },
};

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface DrawCellOptions {
  glow?: number;
  extraGlow?: string;
}

/** Draws one board/piece cell: beveled fill, neon outline, and its 1-2 character label. */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colorIndex: number,
  char: string,
  isEmpty: boolean,
  options: DrawCellOptions = {},
): void {
  const palette = TETROMINO_PALETTE[colorIndex] ?? TETROMINO_PALETTE[0];
  const pad = size * 0.045;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const gx = x + pad;
  const gy = y + pad;
  const r = size * 0.14;

  ctx.save();
  if (options.glow) {
    ctx.shadowColor = options.extraGlow ?? palette.glow;
    ctx.shadowBlur = options.glow;
  }

  const grad = ctx.createLinearGradient(gx, gy, gx, gy + h);
  if (isEmpty) {
    grad.addColorStop(0, palette.dark);
    grad.addColorStop(1, palette.dark);
  } else {
    grad.addColorStop(0, palette.light);
    grad.addColorStop(0.45, palette.base);
    grad.addColorStop(1, palette.dark);
  }
  ctx.fillStyle = grad;
  roundRectPath(ctx, gx, gy, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!isEmpty) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(gx + w * 0.12, gy + h * 0.08);
    ctx.lineTo(gx + w * 0.88, gy + h * 0.08);
    ctx.stroke();
  }

  ctx.strokeStyle = isEmpty ? "rgba(255,255,255,0.12)" : palette.glow;
  ctx.lineWidth = Math.max(1, size * 0.05);
  roundRectPath(ctx, gx, gy, w, h, r);
  ctx.stroke();
  ctx.restore();

  if (!isEmpty && char) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = char.length > 1 ? size * 0.32 : size * 0.46;
    ctx.font = `800 ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", "Pretendard", sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = size * 0.08;
    ctx.fillStyle = "#f8fbff";
    ctx.fillText(char, x + size / 2, y + size / 2 + size * 0.02);
    ctx.restore();
  }
}
