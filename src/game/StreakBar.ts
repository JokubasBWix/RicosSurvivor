import { StreakManager, TIER_2_THRESHOLD, TIER_3_THRESHOLD, MAX_STREAK } from './StreakManager';

interface FlameParticle {
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

const BAR_HEIGHT = 24;
const BAR_MARGIN_X = 40;
const BAR_BOTTOM_OFFSET = 0;
const BORDER_RADIUS = 0;
const GRADIENT_SPEED = 0.8;
const FILL_LERP_SPEED = 8;
const LABEL_OFFSET_Y = 6;

export class StreakBar {
  private animTime: number = 0;
  private currentFill: number = 0;
  private particles: FlameParticle[] = [];

  private static readonly FLAME_COLORS = ['#FFD700', '#FFA500', '#FF6600', '#FF4500', '#FFE066'];

  update(deltaTime: number): void {
    this.animTime += deltaTime;

    for (const p of this.particles) {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size *= 1 - deltaTime * 2.5;
      if (p.size < 0.3) p.size = 0.3;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    streakManager: StreakManager
  ): void {
    const { streak, multiplier, progress } = streakManager;

    const barX = 0;
    const barY = canvasHeight - BAR_BOTTOM_OFFSET - BAR_HEIGHT;
    const barWidth = canvasWidth;

    const targetFill = progress * barWidth;
    this.currentFill += (targetFill - this.currentFill) * Math.min(1, FILL_LERP_SPEED * (1 / 60));
    if (Math.abs(this.currentFill - targetFill) < 0.5) this.currentFill = targetFill;

    ctx.save();

    // Background track
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, BAR_HEIGHT, BORDER_RADIUS);
    ctx.fill();

    // Filled portion
    if (this.currentFill > 1) {
      if (multiplier >= 2) {
        ctx.shadowColor = multiplier === 3 ? '#FF6600' : '#FFD700';
        ctx.shadowBlur = multiplier === 3 ? 18 : 10;
      }

      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(BAR_HEIGHT, this.currentFill), BAR_HEIGHT, BORDER_RADIUS);
      ctx.clip();

      const gradOffset = (this.animTime * GRADIENT_SPEED) % 1;
      const grad = ctx.createLinearGradient(
        barX - barWidth * gradOffset, barY,
        barX + barWidth * (1 - gradOffset), barY
      );
      const stops = multiplier === 3
        ? ['#FF6600', '#FFD700', '#FF4500', '#FFA500', '#FFE066', '#FF6600']
        : ['#FFD700', '#FFA500', '#FFE066', '#DAA520', '#FFD700'];

      for (let i = 0; i < stops.length; i++) {
        grad.addColorStop(i / (stops.length - 1), stops[i]);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, this.currentFill, BAR_HEIGHT);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Breakpoint markers
    const tier2X = barX + (TIER_2_THRESHOLD / MAX_STREAK) * barWidth;
    const tier3X = barX + (TIER_3_THRESHOLD / MAX_STREAK) * barWidth;

    this.drawBreakpoint(ctx, tier2X, barY, streak >= TIER_2_THRESHOLD ? '2x' : '', streak >= TIER_2_THRESHOLD);
    this.drawBreakpoint(ctx, tier3X, barY, streak >= TIER_3_THRESHOLD ? '3x' : '', streak >= TIER_3_THRESHOLD);

    // Flame particles at 3x
    if (multiplier === 3) {
      this.spawnFlameParticles(barX, barY, this.currentFill);
    }

    this.renderParticles(ctx);
  }

  private drawBreakpoint(
    ctx: CanvasRenderingContext2D,
    x: number,
    barY: number,
    label: string,
    reached: boolean
  ): void {
    const alpha = reached ? 1 : 0.4;

    ctx.strokeStyle = `rgba(${reached ? '255,215,0' : '136,136,136'}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, barY);
    ctx.lineTo(x, barY + BAR_HEIGHT);
    ctx.stroke();

    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = alpha;

    const labelY = barY - LABEL_OFFSET_Y;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(label, x, labelY);

    ctx.fillStyle = reached ? '#FFD700' : '#aaaaaa';
    ctx.fillText(label, x, labelY);

    ctx.globalAlpha = 1;
  }

  private spawnFlameParticles(barX: number, barY: number, fillWidth: number): void {
    const spawnCount = 2;
    for (let i = 0; i < spawnCount; i++) {
      const x = barX + Math.random() * fillWidth;
      const life = 0.3 + Math.random() * 0.4;
      this.particles.push({
        x,
        y: barY - 2,
        vx: (Math.random() - 0.5) * 30,
        vy: -(30 + Math.random() * 50),
        alpha: 1,
        size: 2 + Math.random() * 3,
        color: StreakBar.FLAME_COLORS[Math.floor(Math.random() * StreakBar.FLAME_COLORS.length)],
        life,
        maxLife: life,
      });
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
