export class ScreenShake {
  intensity = 0;

  trigger(amount: number): void {
    this.intensity = Math.max(this.intensity, amount);
  }

  update(dtMs: number): void {
    if (this.intensity <= 0) return;
    this.intensity *= Math.pow(0.001, dtMs / 350);
    if (this.intensity < 0.05) this.intensity = 0;
  }

  getOffset(): { x: number; y: number } {
    if (this.intensity <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() * 2 - 1) * this.intensity,
      y: (Math.random() * 2 - 1) * this.intensity,
    };
  }
}

export class FlashEffect {
  alpha = 0;

  trigger(amount: number): void {
    this.alpha = Math.max(this.alpha, amount);
  }

  update(dtMs: number): void {
    if (this.alpha <= 0) return;
    this.alpha *= Math.pow(0.001, dtMs / 500);
    if (this.alpha < 0.02) this.alpha = 0;
  }
}

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
}

let starField: Star[] = [];
let starFieldKey = "";

function ensureStars(width: number, height: number): Star[] {
  const key = `${Math.round(width / 40)}x${Math.round(height / 40)}`;
  if (key !== starFieldKey) {
    starFieldKey = key;
    const count = Math.round((width * height) / 9000);
    starField = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.85 ? 1 : 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }
  return starField;
}

/**
 * Near-black arcade backdrop: a handful of static pixel stars, a very faint
 * vignette, and a subtle CRT scanline pass. Deliberately avoids neon grids,
 * glow bands, or gradients - the flat black cabinet look from the reference
 * screenshots rather than a modern glass HUD.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, clock: number): void {
  ctx.save();
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);

  const stars = ensureStars(width, height);
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(clock / 900 + star.phase);
    ctx.globalAlpha = 0.25 + twinkle * 0.45;
    ctx.fillStyle = "#f4f4e8";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.35,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(0,0,0,0.10)";
  const scanStep = 4;
  for (let y = 0; y < height; y += scanStep) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.restore();
}
