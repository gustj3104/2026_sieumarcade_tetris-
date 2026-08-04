export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  gravity: boolean;
  startX?: number;
  startY?: number;
  target?: { x: number; y: number };
}

const GRAVITY_PX_S2 = 560;

export class ParticleSystem {
  particles: Particle[] = [];

  /** Small pixel-dust explosion for one grid cell (landing thump, line clear). */
  spawnCellBurst(px: number, py: number, size: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: px + Math.random() * size,
        y: py + Math.random() * size,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 220 - 90,
        color,
        life: 0,
        maxLife: 400 + Math.random() * 350,
        size: 2 + Math.random() * 3,
        gravity: true,
      });
    }
  }

  /** Big radial burst used for the finale full-board detonation. */
  spawnRadialBurst(x: number, y: number, color: string, count: number, speed = 260): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        color,
        life: 0,
        maxLife: 700 + Math.random() * 500,
        size: 2 + Math.random() * 4,
        gravity: false,
      });
    }
  }

  /** Small upward-drifting spark, used for the pre-burst "energy charge" beat. */
  spawnRising(x: number, y: number, color: string): void {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 50,
      vy: -110 - Math.random() * 160,
      color,
      life: 0,
      maxLife: 300 + Math.random() * 250,
      size: 2 + Math.random() * 2,
      gravity: false,
    });
  }

  /** A particle that eases toward a fixed target instead of following physics. */
  spawnGather(fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    this.particles.push({
      x: fromX,
      y: fromY,
      startX: fromX,
      startY: fromY,
      target: { x: toX, y: toY },
      vx: 0,
      vy: 0,
      color,
      life: 0,
      maxLife: 550 + Math.random() * 300,
      size: 2 + Math.random() * 3,
      gravity: false,
    });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.particles = this.particles.filter((p) => {
      p.life += dtMs;
      if (p.life >= p.maxLife) return false;
      if (p.target && p.startX !== undefined && p.startY !== undefined) {
        const t = Math.min(p.life / p.maxLife, 1);
        const eased = 1 - Math.pow(1 - t, 2);
        p.x = p.startX + (p.target.x - p.startX) * eased;
        p.y = p.startY + (p.target.y - p.startY) * eased;
      } else {
        if (p.gravity) p.vy += GRAVITY_PX_S2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      return true;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles = [];
  }
}
