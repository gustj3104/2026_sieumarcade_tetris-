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

/** Dark arcade backdrop: faint grid, vignette, scanlines. Cheap enough to redraw every frame. */
export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, clock: number): void {
  ctx.save();
  ctx.fillStyle = "#05060f";
  ctx.fillRect(0, 0, width, height);

  const gridSize = 28;
  ctx.strokeStyle = "rgba(80, 120, 200, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  const scanStep = 4;
  const offset = Math.floor(clock / 60) % scanStep;
  for (let y = offset; y < height; y += scanStep) {
    ctx.fillRect(0, y, width, 1);
  }

  // occasional subtle horizontal glitch band
  const glitchPhase = Math.floor(clock / 2200) % 40;
  if (glitchPhase === 0) {
    const bandY = (clock * 0.37) % height;
    const bandH = 6 + Math.random() * 10;
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#66e0ff";
    ctx.fillRect(0, bandY, width, bandH);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
