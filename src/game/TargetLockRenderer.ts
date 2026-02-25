import { Enemy } from '../types';

const LOCK_IN_DURATION = 0.5;        // seconds for the full shrink animation
const START_RADIUS_MULTIPLIER = 25;   // initial circle size relative to enemy radius
const LOCKED_RADIUS_PAD = 8;         // final snug padding around enemy radius
const TICK_LENGTH = 14;              // length of crosshair tick marks
const LINE_WIDTH = 3.5;
const DASH_PATTERN: number[] = [8,5];
const COLOR = '#b8860b';             // dark goldenrod
const GLOW_COLOR = '#daa520';        // goldenrod glow
const FILL_COLOR = 'rgba(184, 134, 11, 0.18)'; // darker golden transparent fill
const GLOW_BLUR = 16;
const ROTATION_SPEED = Math.PI * 3;  // radians per second during lock-in

export class TargetLockRenderer {
  private target: Enemy | null = null;
  private lockTimer: number = 0;
  private animating: boolean = false;

  setTarget(enemy: Enemy | null): void {
    if (enemy === null) {
      this.target = null;
      this.animating = false;
      this.lockTimer = 0;
      return;
    }

    // Only trigger animation on a *new* target
    if (enemy !== this.target) {
      this.target = enemy;
      this.animating = true;
      this.lockTimer = 0;
    }
  }

  update(dt: number): void {
    if (!this.animating || !this.target) return;

    this.lockTimer += dt;

    if (this.lockTimer >= LOCK_IN_DURATION) {
      this.animating = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.animating || !this.target) return;

    const t = Math.min(this.lockTimer / LOCK_IN_DURATION, 1);
    // Ease-out cubic for a satisfying snap
    const ease = 1 - Math.pow(1 - t, 3);

    const { x, y } = this.target.position;
    const baseRadius = this.target.radius + LOCKED_RADIUS_PAD;
    const startRadius = baseRadius * START_RADIUS_MULTIPLIER;
    const currentRadius = startRadius + (baseRadius - startRadius) * ease;

    // Rotation angle — spins fast at start, decelerates to stop
    const rotation = ROTATION_SPEED * this.lockTimer * (1 - ease);

    // Fade in quickly at the start, then fade out in the last 40%
    let alpha: number;
    if (t < 0.3) {
      alpha = t / 0.3;               // fade in
    } else if (t > 0.6) {
      alpha = 1 - (t - 0.6) / 0.4;   // fade out
    } else {
      alpha = 1;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.shadowColor = GLOW_COLOR;
    ctx.shadowBlur = GLOW_BLUR;
    ctx.strokeStyle = COLOR;
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = LINE_WIDTH;

    // Inner golden fill
    ctx.fillStyle = FILL_COLOR;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dashed circle
    ctx.setLineDash(DASH_PATTERN);
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks at N/S/E/W (solid)
    ctx.setLineDash([]);
    const ticks = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
    ];

    for (const tick of ticks) {
      const innerX = tick.dx * (currentRadius - TICK_LENGTH / 2);
      const innerY = tick.dy * (currentRadius - TICK_LENGTH / 2);
      const outerX = tick.dx * (currentRadius + TICK_LENGTH / 2);
      const outerY = tick.dy * (currentRadius + TICK_LENGTH / 2);

      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }

    ctx.restore();
  }
}
