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

const SHARD_COUNT_MIN = 12;
const SHARD_COUNT_MAX = 18;
const SPARK_COUNT_MIN = 8;
const SPARK_COUNT_MAX = 12;

const SHARD_LIFETIME = 0.6;
const SPARK_LIFETIME = 0.3;
const GRAVITY = 120;
const FRICTION = 2.5;

export class ShatterEffect {
  private shards: Shard[] = [];
  private sparks: Spark[] = [];
  private elapsed: number = 0;
  private _isFinished: boolean = false;

  private static readonly SHARD_COLORS = ['#1a1a1a', '#ffffff', '#d4af37', '#2a2a2a', '#f5e6a3', '#c0c0c0'];
  private static readonly SPARK_COLORS = ['#ffffff', '#d4af37', '#f5e6a3'];

  constructor(position: Position, radius: number, _color: string) {
    const shardCount =
      SHARD_COUNT_MIN + Math.floor(Math.random() * (SHARD_COUNT_MAX - SHARD_COUNT_MIN + 1));
    const sparkCount =
      SPARK_COUNT_MIN + Math.floor(Math.random() * (SPARK_COUNT_MAX - SPARK_COUNT_MIN + 1));

    // Create shards
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 250;
      // Offset slightly from center so shards don't all originate from the exact same pixel
      const offsetDist = Math.random() * radius * 0.5;

      this.shards.push({
        x: position.x + Math.cos(angle) * offsetDist,
        y: position.y + Math.sin(angle) * offsetDist,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 15,
        size: 6 + Math.random() * (radius * 0.6),
        alpha: 1,
        color: ShatterEffect.SHARD_COLORS[Math.floor(Math.random() * ShatterEffect.SHARD_COLORS.length)]
      });
    }

    // Create sparks
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 220 + Math.random() * 350;

      this.sparks.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 3 + Math.random() * 4,
        color: ShatterEffect.SPARK_COLORS[Math.floor(Math.random() * ShatterEffect.SPARK_COLORS.length)]
      });
    }
  }

  update(deltaTime: number): void {
    if (this._isFinished) return;

    this.elapsed += deltaTime;

    // Update shards
    for (const shard of this.shards) {
      shard.vx *= Math.pow(0.01, deltaTime * FRICTION);
      shard.vy *= Math.pow(0.01, deltaTime * FRICTION);
      shard.vy += GRAVITY * deltaTime;

      shard.x += shard.vx * deltaTime;
      shard.y += shard.vy * deltaTime;
      shard.rotation += shard.angularVelocity * deltaTime;

      // Fade based on elapsed time
      const t = Math.min(1, this.elapsed / SHARD_LIFETIME);
      shard.alpha = 1 - t;
      shard.size *= 1 - deltaTime * 1.5; // shrink over time
      if (shard.size < 0.5) shard.size = 0.5;
    }

    // Update sparks
    for (const spark of this.sparks) {
      spark.x += spark.vx * deltaTime;
      spark.y += spark.vy * deltaTime;

      const t = Math.min(1, this.elapsed / SPARK_LIFETIME);
      spark.alpha = 1 - t;
      spark.size *= 1 - deltaTime * 3;
      if (spark.size < 0.3) spark.size = 0.3;
    }

    // Mark finished when the longer-lived shards are done
    if (this.elapsed >= SHARD_LIFETIME) {
      this._isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this._isFinished) return;

    // Draw sparks (behind shards)
    for (const spark of this.sparks) {
      if (spark.alpha <= 0) continue;
      ctx.globalAlpha = spark.alpha;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw shards as small triangles
    for (const shard of this.shards) {
      if (shard.alpha <= 0) continue;
      ctx.globalAlpha = shard.alpha;
      ctx.fillStyle = shard.color;

      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.rotation);

      const s = shard.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(-s * 0.7, s * 0.6);
      ctx.lineTo(s * 0.7, s * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  get isFinished(): boolean {
    return this._isFinished;
  }

}
