export type BattleParticleType = "blockPixel" | "brick" | "textPixel" | "star" | "streak" | "spark";

export interface BattleParticle {
  id: number;
  type: BattleParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  angularVelocity: number;
  color: string;
  alpha: number;
  lifetime: number;
  /** ms remaining before this particle starts moving/drawing. */
  delay: number;
  age: number;
}

export interface SpawnOptions {
  type: BattleParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  lifetime: number;
  delay?: number;
  rotation?: number;
  angularVelocity?: number;
}

const MAX_PARTICLES = 1400;
const GRAVITY_PX_S2 = 260;
/** blockPixel/brick/textPixel feel weight; star/streak/spark stay weightless so they read as light/energy, not debris. */
const GRAVITY_TYPES = new Set<BattleParticleType>(["blockPixel", "brick", "textPixel"]);
const DRAG = 0.992;

function clampInt(n: number): number {
  return Math.round(n);
}

/**
 * Drives every pixel-fragment effect in the battle-open transition: the
 * board/panel burst, the key-visual assembly convergence, and the ambient
 * sparkle during the persisted battle-open hold. Deliberately separate from
 * rendering/particleSystem.ts (the small in-board gameplay bursts) because
 * this one draws on a full-viewport overlay canvas and needs typed particle
 * shapes + spawn delay for staggered, position-sourced bursts.
 */
export class BattleParticleSystem {
  particles: BattleParticle[] = [];
  /** Scales down spawn counts automatically when the frame budget is tight. */
  qualityScale = 1;

  private nextId = 1;

  spawn(opts: SpawnOptions): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      id: this.nextId++,
      type: opts.type,
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy,
      size: opts.size,
      color: opts.color,
      lifetime: opts.lifetime,
      delay: opts.delay ?? 0,
      rotation: opts.rotation ?? Math.random() * Math.PI * 2,
      angularVelocity: opts.angularVelocity ?? (Math.random() - 0.5) * 8,
      alpha: 1,
      age: 0,
    });
  }

  /** Spawns `count * qualityScale` particles via `make(i)`, for burst-style bulk emission. */
  spawnBatch(count: number, make: (index: number) => SpawnOptions): void {
    const n = Math.max(0, Math.round(count * this.qualityScale));
    for (let i = 0; i < n; i++) {
      this.spawn(make(i));
    }
  }

  update(dtMs: number, viewportW: number, viewportH: number): void {
    const dt = dtMs / 1000;
    const margin = 160;
    this.particles = this.particles.filter((p) => {
      p.age += dtMs;
      if (p.delay > 0) {
        p.delay -= dtMs;
        return true;
      }
      if (p.age - Math.max(0, p.delay) >= p.lifetime) return false;

      if (GRAVITY_TYPES.has(p.type)) {
        p.vy += GRAVITY_PX_S2 * dt;
        p.vx *= DRAG;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.angularVelocity * dt;

      if (p.x < -margin || p.x > viewportW + margin || p.y < -margin || p.y > viewportH + margin) {
        return false;
      }
      return true;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.delay > 0) continue;
      const lifeT = Math.max(0, Math.min(1, p.age / p.lifetime));
      const alpha = Math.max(0, 1 - lifeT);
      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(clampInt(p.x), clampInt(p.y));

      switch (p.type) {
        case "streak": {
          const len = Math.max(p.size, Math.hypot(p.vx, p.vy) * 0.05);
          const angle = Math.atan2(p.vy, p.vx);
          ctx.rotate(angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(0, -Math.max(1, Math.round(p.size * 0.18)), Math.round(len), Math.max(2, Math.round(p.size * 0.36)));
          break;
        }
        case "star": {
          ctx.rotate(p.rotation);
          drawMiniStar(ctx, Math.round(p.size), p.color);
          break;
        }
        case "spark": {
          const s = Math.max(1, Math.round(p.size * (1 - lifeT * 0.4)));
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-s, -s, s * 2, s * 2);
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillStyle = p.color;
          ctx.fillRect(-s * 2, -s * 2, s * 4, s * 4);
          break;
        }
        case "brick": {
          ctx.rotate(p.rotation);
          const w = Math.round(p.size);
          const h = Math.round(p.size * 0.62);
          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = p.color;
          ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
          break;
        }
        case "textPixel": {
          ctx.rotate(p.rotation);
          const s = Math.round(p.size);
          ctx.fillStyle = "#000000";
          ctx.fillRect(-s / 2 - 1, -s / 2 - 1, s + 2, s + 2);
          ctx.fillStyle = p.color;
          ctx.fillRect(-s / 2, -s / 2, s, s);
          break;
        }
        case "blockPixel":
        default: {
          ctx.rotate(p.rotation);
          const s = Math.round(p.size);
          ctx.fillStyle = "#000000";
          ctx.fillRect(-s / 2 - 1, -s / 2 - 1, s + 2, s + 2);
          ctx.fillStyle = p.color;
          ctx.fillRect(-s / 2, -s / 2, s, s);
          const bevel = Math.max(1, Math.round(s * 0.22));
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(-s / 2, -s / 2, s, bevel);
          break;
        }
      }
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }

  get count(): number {
    return this.particles.length;
  }
}

function drawMiniStar(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const r = size;
  const rInner = size * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? r : rInner;
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
