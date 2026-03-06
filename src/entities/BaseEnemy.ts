import { Enemy, Position, Velocity } from '../types';
import { FONT_DEFAULT } from '../game/FontLoader';
import { SeededRNG } from '../utils/SeededRNG';

// Typing-feedback constants
const UNLOCKED_TEXT_COLOR = '#2a2a2a';
const LOCKED_REMAINING_COLOR = '#f0e6c8';             // warm cream for untyped letters on dark pill
const LOCKED_TYPED_COLOR = 'rgba(218, 165, 32, 0.45)'; // muted gold for already-typed letters
const BG_DEFAULT = 'rgba(255, 255, 255, 0.55)';
const BG_LOCKED = 'rgba(48, 40, 20, 0.92)';
const BG_LOCKED_BORDER = 'rgba(184, 134, 11, 0.6)';
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
  public isMinion: boolean = false;
  public isTargeted: boolean = false;
  protected fontFamily: string = FONT_DEFAULT;
  protected fontSize: number = 16;
  protected displayUppercase: boolean = false;

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

    const xform = this.displayUppercase ? (s: string) => s.toUpperCase() : (s: string) => s;
    const typedPart = xform(this.word.substring(0, this.typed.length));
    const remaining = xform(this.word.substring(this.typed.length));

    ctx.save();

    ctx.font = `${this.fontSize}px "${this.fontFamily}", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fullMetrics = ctx.measureText(xform(this.word));
    const remainingMetrics = ctx.measureText(remaining);
    const typedMetrics = ctx.measureText(typedPart);
    const padX = 6;
    const padY = 4;

    const pillW = remainingMetrics.width + padX * 2;
    const pillH = this.fontSize + padY * 2;

    let wordX = this.position.x;
    let wordY = this.position.y - this.radius - 20;

    const screenMargin = 4;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    wordX = Math.max(pillW / 2 + screenMargin, Math.min(cw - pillW / 2 - screenMargin, wordX));
    wordY = Math.max(this.fontSize / 2 + padY + screenMargin, Math.min(ch - this.fontSize / 2 - padY - screenMargin, wordY));

    ctx.translate(wordX, wordY);
    ctx.scale(this.typedScale, this.typedScale);
    ctx.translate(-wordX, -wordY);

    const pillX = wordX - pillW / 2;
    const pillY = wordY - this.fontSize / 2 - padY;

    if (this.isTargeted) {
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

    ctx.fillStyle = this.isTargeted ? LOCKED_REMAINING_COLOR : UNLOCKED_TEXT_COLOR;
    ctx.fillText(remaining, wordX, wordY);

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
    speedMax: number,
    rng?: SeededRNG
  ): { position: Position; velocity: Velocity } {
    const rand = rng ? () => rng.next() : Math.random;
    const angle = rand() * Math.PI * 2;
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
    const speed = speedMin + rand() * (speedMax - speedMin);

    return {
      position: { x: startX, y: startY },
      velocity: { x: (dx / distance) * speed, y: (dy / distance) * speed }
    };
  }
}
