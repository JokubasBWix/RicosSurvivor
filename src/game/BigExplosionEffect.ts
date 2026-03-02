import { Position } from '../types';

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  size: number;
  alpha: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
}

const SHARD_COUNT_MIN = 36;
const SHARD_COUNT_MAX = 48;
const SPARK_COUNT_MIN = 24;
const SPARK_COUNT_MAX = 36;
const EMBER_COUNT_MIN = 15;
const EMBER_COUNT_MAX = 20;
const SMOKE_COUNT_MIN = 6;
const SMOKE_COUNT_MAX = 10;

const SHARD_LIFETIME = 1.0;
const SPARK_LIFETIME = 0.4;
const FLASH_LIFETIME = 0.15;
const EMBER_LIFETIME = 1.5;
const SMOKE_LIFETIME = 1.2;
const TOTAL_LIFETIME = EMBER_LIFETIME;

const GRAVITY = 100;
const FRICTION = 2.0;

const SHARD_COLORS = ['#1a1a1a', '#ffffff', '#d4af37', '#FF6600', '#FFA500', '#c0c0c0', '#FF4500'];
const SPARK_COLORS = ['#ffffff', '#FFD700', '#FF6600', '#FF4500', '#FFA500'];
const EMBER_COLORS = ['#FF6600', '#FF4500', '#FFA500', '#FFD700'];
const SMOKE_COLOR = '#333333';

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export class BigExplosionEffect {
  private shards: Shard[] = [];
  private sparks: Spark[] = [];
  private embers: Ember[] = [];
  private smokePuffs: SmokePuff[] = [];
  private elapsed: number = 0;
  private _isFinished: boolean = false;
  private flashRadius: number;
  private flashMaxRadius: number;
  private flashAlpha: number = 1;

  constructor(position: Position, radius: number) {
    this.flashRadius = radius;
    this.flashMaxRadius = radius * 6;

    const shardCount = randInt(SHARD_COUNT_MIN, SHARD_COUNT_MAX);
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 400;
      const offsetDist = Math.random() * radius * 0.5;
      this.shards.push({
        x: position.x + Math.cos(angle) * offsetDist,
        y: position.y + Math.sin(angle) * offsetDist,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 20,
        size: 8 + Math.random() * (radius * 0.8),
        alpha: 1,
        color: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)],
      });
    }

    const sparkCount = randInt(SPARK_COUNT_MIN, SPARK_COUNT_MAX);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 300 + Math.random() * 500;
      this.sparks.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 3 + Math.random() * 5,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      });
    }

    const emberCount = randInt(EMBER_COUNT_MIN, EMBER_COUNT_MAX);
    for (let i = 0; i < emberCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      const life = EMBER_LIFETIME * (0.6 + Math.random() * 0.4);
      this.embers.push({
        x: position.x + (Math.random() - 0.5) * radius,
        y: position.y + (Math.random() - 0.5) * radius,
        vx: Math.cos(angle) * speed,
        vy: -(30 + Math.random() * 50),
        alpha: 1,
        size: 2 + Math.random() * 4,
        color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
        life,
        maxLife: life,
      });
    }

    const smokeCount = randInt(SMOKE_COUNT_MIN, SMOKE_COUNT_MAX);
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 40;
      const life = SMOKE_LIFETIME * (0.6 + Math.random() * 0.4);
      const maxSize = 20 + Math.random() * 35;
      this.smokePuffs.push({
        x: position.x + (Math.random() - 0.5) * radius * 0.8,
        y: position.y + (Math.random() - 0.5) * radius * 0.8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        alpha: 0.5 + Math.random() * 0.2,
        size: 5 + Math.random() * 8,
        maxSize,
        life,
        maxLife: life,
      });
    }
  }

  update(deltaTime: number): void {
    if (this._isFinished) return;
    this.elapsed += deltaTime;

    // Flash ring
    if (this.elapsed < FLASH_LIFETIME) {
      const t = this.elapsed / FLASH_LIFETIME;
      this.flashRadius += (this.flashMaxRadius - this.flashRadius) * 0.3;
      this.flashAlpha = 1 - t;
    }

    // Shards
    for (const s of this.shards) {
      s.vx *= Math.pow(0.01, deltaTime * FRICTION);
      s.vy *= Math.pow(0.01, deltaTime * FRICTION);
      s.vy += GRAVITY * deltaTime;
      s.x += s.vx * deltaTime;
      s.y += s.vy * deltaTime;
      s.rotation += s.angularVelocity * deltaTime;
      const t = Math.min(1, this.elapsed / SHARD_LIFETIME);
      s.alpha = 1 - t;
      s.size *= 1 - deltaTime * 1.2;
      if (s.size < 0.5) s.size = 0.5;
    }

    // Sparks
    for (const sp of this.sparks) {
      sp.x += sp.vx * deltaTime;
      sp.y += sp.vy * deltaTime;
      sp.vy += GRAVITY * 0.5 * deltaTime;
      const t = Math.min(1, this.elapsed / SPARK_LIFETIME);
      sp.alpha = 1 - t;
      sp.size *= 1 - deltaTime * 3;
      if (sp.size < 0.3) sp.size = 0.3;
    }

    // Embers
    for (const e of this.embers) {
      e.x += e.vx * deltaTime;
      e.y += e.vy * deltaTime;
      e.vy += 10 * deltaTime;
      e.vx *= Math.pow(0.3, deltaTime);
      e.life -= deltaTime;
      e.alpha = Math.max(0, e.life / e.maxLife);
      e.size *= 1 - deltaTime * 0.5;
      if (e.size < 0.3) e.size = 0.3;
    }

    // Smoke puffs
    for (const p of this.smokePuffs) {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= Math.pow(0.1, deltaTime);
      p.vy *= Math.pow(0.1, deltaTime);
      p.life -= deltaTime;
      const lifeT = 1 - p.life / p.maxLife;
      p.size += (p.maxSize - p.size) * deltaTime * 2;
      p.alpha = (0.5 - lifeT * 0.5) * Math.max(0, p.life / p.maxLife);
    }

    if (this.elapsed >= TOTAL_LIFETIME) {
      this._isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this._isFinished) return;

    // Flash ring
    if (this.elapsed < FLASH_LIFETIME && this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 + (1 - this.flashAlpha) * 8;
      ctx.beginPath();
      ctx.arc(
        this.shards[0]?.x ?? 0,
        this.shards[0]?.y ?? 0,
        this.flashRadius,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.globalAlpha = this.flashAlpha * 0.3;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(
        this.shards[0]?.x ?? 0,
        this.shards[0]?.y ?? 0,
        this.flashRadius * 0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Smoke puffs (behind everything)
    for (const p of this.smokePuffs) {
      if (p.alpha <= 0 || p.life <= 0) continue;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = SMOKE_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparks
    for (const sp of this.sparks) {
      if (sp.alpha <= 0) continue;
      ctx.globalAlpha = sp.alpha;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shards
    for (const s of this.shards) {
      if (s.alpha <= 0) continue;
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      const sz = s.size;
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(-sz * 0.7, sz * 0.6);
      ctx.lineTo(sz * 0.7, sz * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Embers (on top, glowing)
    for (const e of this.embers) {
      if (e.alpha <= 0) continue;
      ctx.globalAlpha = e.alpha * 0.6;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  get isFinished(): boolean {
    return this._isFinished;
  }
}
