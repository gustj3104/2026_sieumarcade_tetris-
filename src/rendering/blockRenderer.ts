export interface CellPalette {
  base: string;
  light: string;
  dark: string;
}

/**
 * colorIndex -> palette, matching TETROMINO_COLORS in game/tetrominoes.ts
 * (I,O,T,L,J,S,Z). Mirrors the classic NES Tetris convention (cyan I, yellow
 * O, purple T, orange L, blue J, green S, red Z) and the --block-* tokens in
 * styles/tokens.css, so canvas blocks and the DOM preview blocks match.
 */
export const TETROMINO_PALETTE: Record<number, CellPalette> = {
  0: { base: "#14a9c8", light: "#7fe3f5", dark: "#0a4a58" }, // I - cyan
  1: { base: "#e9c400", light: "#fff08a", dark: "#5c4e00" }, // O - yellow
  2: { base: "#8734c5", light: "#caa0ff", dark: "#341254" }, // T - purple
  3: { base: "#e97800", light: "#ffb366", dark: "#5c2f00" }, // L - orange
  4: { base: "#1767cc", light: "#7fb0ff", dark: "#0a2c54" }, // J - blue
  5: { base: "#4bad16", light: "#a3e878", dark: "#1c4208" }, // S - green
  6: { base: "#d93118", light: "#ff9d85", dark: "#4d1108" }, // Z - red
};

export interface DrawCellOptions {
  /** The currently-falling piece: gets a thin bright outline instead of a blurred glow. */
  active?: boolean;
  /** 0..1 solid white overlay, used for the line-clear flash beat. */
  whiteFlash?: number;
}

/**
 * Draws one flat, beveled pixel-art block: black outline, solid fill, a
 * light top/left bevel strip and a dark bottom/right one (the classic
 * NES-sprite trick for implying a 3D block with zero gradients/blur).
 *
 * `isEmpty` cells (a name shorter than 4 chars) still get the full opaque
 * block treatment - only the character glyph is skipped - so a landed piece
 * never shows a transparent gap.
 */
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
  const gap = Math.max(1, size * 0.03);
  const bx = x + gap;
  const by = y + gap;
  const bw = size - gap * 2;
  const bh = size - gap * 2;
  const border = Math.max(1.5, size * 0.05);
  const bevel = Math.max(2, size * 0.14);

  ctx.save();

  // Black pixel outline.
  ctx.fillStyle = "#000000";
  ctx.fillRect(bx, by, bw, bh);

  // Solid base fill.
  const ix = bx + border;
  const iy = by + border;
  const iw = bw - border * 2;
  const ih = bh - border * 2;
  ctx.fillStyle = palette.base;
  ctx.fillRect(ix, iy, iw, ih);

  // Light bevel: top + left.
  ctx.fillStyle = palette.light;
  ctx.fillRect(ix, iy, iw, bevel);
  ctx.fillRect(ix, iy, bevel, ih);

  // Dark bevel: bottom + right.
  ctx.fillStyle = palette.dark;
  ctx.fillRect(ix, iy + ih - bevel, iw, bevel);
  ctx.fillRect(ix + iw - bevel, iy, bevel, ih);

  if (options.active) {
    ctx.strokeStyle = "#f4f4e8";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.strokeRect(bx + ctx.lineWidth / 2, by + ctx.lineWidth / 2, bw - ctx.lineWidth, bh - ctx.lineWidth);
  }

  if (options.whiteFlash) {
    ctx.globalAlpha = Math.max(0, Math.min(1, options.whiteFlash));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  if (!isEmpty && char) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = char.length > 1 ? size * 0.34 : size * 0.5;
    ctx.font = `800 ${fontSize}px "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    const cx = x + size / 2;
    const cy = y + size / 2 + size * 0.02;
    // Hard 1px offset shadow instead of shadowBlur - keeps text crisp/pixel-flat.
    ctx.fillStyle = "#000000";
    ctx.fillText(char, cx + Math.max(1, size * 0.03), cy + Math.max(1, size * 0.03));
    ctx.fillStyle = "#f4f4e8";
    ctx.fillText(char, cx, cy);
    ctx.restore();
  }
}
