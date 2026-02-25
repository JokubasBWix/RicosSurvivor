import { Position } from '../types';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

const SPARK_COUNT_MIN = 4;
const SPARK_COUNT_MAX = 6;
const LIFETIME = 0.2;

export class ImpactEffect {
  private sparks: Spark[] = [];
  private elapsed: number = 0;
  private _isFinished: boolean = false;

  private static readonly SPARK_COLORS = ['#ffffff', '#ffe066', '#ffcc33', '#ffaa00'];

  constructor(position: Position, radius: number, color: string) {
    const count =
      SPARK_COUNT_MIN + Math.floor(Math.random() * (SPARK_COUNT_MAX - SPARK_COUNT_MIN + 1));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      const offsetDist = Math.random() * radius * 0.3;

      this.sparks.push({
        x: position.x + Math.cos(angle) * offsetDist,
        y: position.y + Math.sin(angle) * offsetDist,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5
          ? color
          : ImpactEffect.SPARK_COLORS[Math.floor(Math.random() * ImpactEffect.SPARK_COLORS.length)]
      });
    }
  }

  update(deltaTime: number): void {
    if (this._isFinished) return;

    this.elapsed += deltaTime;

    for (const spark of this.sparks) {
      spark.x += spark.vx * deltaTime;
      spark.y += spark.vy * deltaTime;

      const t = Math.min(1, this.elapsed / LIFETIME);
      spark.alpha = 1 - t;
      spark.size *= 1 - deltaTime * 4;
      if (spark.size < 0.2) spark.size = 0.2;
    }

    if (this.elapsed >= LIFETIME) {
      this._isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this._isFinished) return;

    for (const spark of this.sparks) {
      if (spark.alpha <= 0) continue;
      ctx.globalAlpha = spark.alpha;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  get isFinished(): boolean {
    return this._isFinished;
  }
}
