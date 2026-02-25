import { Enemy, Position, Velocity } from '../types';
import { FONT_DEFAULT } from '../game/FontLoader';

// Typing-feedback constants
const LOCKED_TEXT_COLOR = '#b8860b';          // dark goldenrod
const LOCKED_GLOW_COLOR = '#daa520';          // goldenrod glow
const LOCKED_GLOW_BLUR = 10;
const UNLOCKED_TEXT_COLOR = '#2a2a2a';
const TYPED_FADED_COLOR = 'rgba(184, 134, 11, 0.3)'; // faded golden for progress trail
const BG_DEFAULT = 'rgba(255, 255, 255, 0.55)';
const BG_LOCKED = 'rgba(212, 175, 55, 0.15)';
const BG_LOCKED_BORDER = 'rgba(184, 134, 11, 0.35)';
const SCALE_DECAY_SPEED = 12; // how fast scale pops back to 1.0

export abstract class BaseEnemy implements Enemy {
  public position: Position;
  public velocity: Velocity;
  public word: string;
  public typed: string = '';
  public radius: number;
  public isDestroyed: boolean = false;
  public wordCompleted: boolean = false;
  public typedScale: number = 1;
  protected fontFamily: string = FONT_DEFAULT;
  protected fontSize: number = 16;

  constructor(word: string, position: Position, velocity: Velocity, radius: number = 20) {
    this.word = word;
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.radius = radius;
  }

  abstract update(deltaTime: number, targetPosition?: Position): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  /** Decay the typedScale pop back toward 1.0 — call from every subclass update() */
  protected updateScale(deltaTime: number): void {
    if (this.typedScale > 1) {
      this.typedScale = 1 + (this.typedScale - 1) * Math.exp(-SCALE_DECAY_SPEED * deltaTime);
      if (this.typedScale < 1.005) this.typedScale = 1;
    }
  }

  isOffScreen(canvas: HTMLCanvasElement): boolean {
    const margin = Math.max(canvas.width, canvas.height);
    return (
      this.position.x < -margin ||
      this.position.x > canvas.width + margin ||
      this.position.y < -margin ||
      this.position.y > canvas.height + margin
    );
  }

  checkCollision(player: { position: Position; radius: number }): boolean {
    const dx = this.position.x - player.position.x;
    const dy = this.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + player.radius;
  }

  protected renderWord(ctx: CanvasRenderingContext2D): void {
    if (this.wordCompleted) return;

    const isLocked = this.typed.length > 0;
    const typedPart = this.word.substring(0, this.typed.length);
    const remaining = this.word.substring(this.typed.length);
    const wordY = this.position.y - this.radius - 20;

    ctx.save();

    // --- Apply scale pop around the word center ---
    ctx.translate(this.position.x, wordY);
    ctx.scale(this.typedScale, this.typedScale);
    ctx.translate(-this.position.x, -wordY);

    ctx.font = `${this.fontSize}px "${this.fontFamily}", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Measure the full word so background pill covers everything
    const fullMetrics = ctx.measureText(this.word);
    const remainingMetrics = ctx.measureText(remaining);
    const typedMetrics = ctx.measureText(typedPart);
    const padX = 6;
    const padY = 4;

    // Background pill — covers the full word width for stability
    const pillW = (isLocked ? fullMetrics.width : remainingMetrics.width) + padX * 2;
    const pillH = this.fontSize + padY * 2;
    const pillX = this.position.x - pillW / 2;
    const pillY = wordY - this.fontSize / 2 - padY;

    if (isLocked) {
      // Golden-tinted pill with subtle border
      ctx.fillStyle = BG_LOCKED;
      ctx.strokeStyle = BG_LOCKED_BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = BG_DEFAULT;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();
    }

    if (isLocked) {
      // -- Draw typed (completed) letters as faded golden progress trail --
      const halfFullWidth = fullMetrics.width / 2;
      const typedX = this.position.x - halfFullWidth + typedMetrics.width / 2;

      ctx.fillStyle = TYPED_FADED_COLOR;
      ctx.fillText(typedPart, typedX, wordY);

      // -- Draw remaining letters with golden color + glow --
      const remainingX = this.position.x - halfFullWidth + typedMetrics.width + remainingMetrics.width / 2;

      ctx.fillStyle = UNLOCKED_TEXT_COLOR;
      ctx.fillText(remaining, remainingX, wordY);
    } else {
      ctx.fillStyle = UNLOCKED_TEXT_COLOR;
      ctx.fillText(remaining, this.position.x, wordY);
    }

    ctx.restore();
  }

  protected homeToward(targetPosition: Position, deltaTime: number): void {
    const dx = targetPosition.x - this.position.x;
    const dy = targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const speed = this.getSpeed();
      this.velocity.x = (dx / distance) * speed;
      this.velocity.y = (dy / distance) * speed;
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  protected getSpeed(): number {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
  }

  static computeSpawn360(
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number,
    speedMax: number
  ): { position: Position; velocity: Velocity } {
    const angle = Math.random() * Math.PI * 2;
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    const edgeDist = Math.min(
      Math.abs(halfW / Math.cos(angle)),
      Math.abs(halfH / Math.sin(angle))
    );
    const spawnDistance = edgeDist * 1.05;
    const startX = targetX + Math.cos(angle) * spawnDistance;
    const startY = targetY + Math.sin(angle) * spawnDistance;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = speedMin + Math.random() * (speedMax - speedMin);

    return {
      position: { x: startX, y: startY },
      velocity: { x: (dx / distance) * speed, y: (dy / distance) * speed }
    };
  }
}
