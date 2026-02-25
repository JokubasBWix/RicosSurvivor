import { Enemy, Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { FONT_SNIPER } from '../game/FontLoader';
import { SniperNail } from './SniperNail';

export class Sniper extends BaseEnemy {
  private stopPosition: Position;
  private hasReachedStop: boolean = false;
  private shootTimer: number = 0;
  private shootInterval: number = 1500;
  private maxShots: number = 8;
  private shotsFired: number = 0;
  public pendingSpawns: Enemy[] = [];

  private playerPosition: Position;
  private words: string[];

  constructor(
    word: string,
    position: Position,
    velocity: Velocity,
    playerPosition: Position,
    words: string[]
  ) {
    super(word, position, velocity, 22);
    this.fontFamily = FONT_SNIPER;
    this.fontSize = 30;
    this.playerPosition = { ...playerPosition };
    this.words = words;

    const angle = Math.atan2(position.y - playerPosition.y, position.x - playerPosition.x);
    const stopDistance = 350 + Math.random() * 150;
    this.stopPosition = {
      x: playerPosition.x + Math.cos(angle) * stopDistance,
      y: playerPosition.y + Math.sin(angle) * stopDistance
    };

  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);
    if (targetPosition) {
      this.playerPosition = { ...targetPosition };
    }

    this.pendingSpawns = [];

    if (!this.hasReachedStop) {
      const dx = this.stopPosition.x - this.position.x;
      const dy = this.stopPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        this.hasReachedStop = true;
        this.velocity = { x: 0, y: 0 };
      } else {
        const speed = this.getSpeed();
        this.velocity.x = (dx / distance) * speed;
        this.velocity.y = (dy / distance) * speed;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
      }
    } else {
      this.shootTimer += deltaTime * 1000;
      if (this.shootTimer >= this.shootInterval && this.shotsFired < this.maxShots) {
        this.shootSniperNail();
        this.shootTimer = 0;
        this.shotsFired++;
      }
    }
  }

  private shootSniperNail(): void {
    const word = this.words[Math.floor(Math.random() * this.words.length)];
    const dx = this.playerPosition.x - this.position.x;
    const dy = this.playerPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 120 + Math.random() * 60;

    const velocity =
      distance > 0
        ? { x: (dx / distance) * speed, y: (dy / distance) * speed }
        : { x: speed, y: 0 };

    const child = new SniperNail(word, { ...this.position }, velocity);
    this.pendingSpawns.push(child);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.hasReachedStop) {
      const pulse = 0.5 + Math.sin(Date.now() / 300) * 0.3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 30, 30, ${pulse * 0.25})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 180, 30, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(50, 220, 50, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.renderWord(ctx);

    if (this.hasReachedStop) {
      ctx.font = `10px "${FONT_SNIPER}", monospace`;
      ctx.fillStyle = 'rgba(255, 80, 80, 0.8)';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${this.shotsFired}/${this.maxShots}`,
        this.position.x,
        this.position.y + this.radius + 15
      );
    }
  }

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 30,
    speedMax: number = 50,
    words: string[] = []
  ): Sniper {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new Sniper(word, position, velocity, { x: targetX, y: targetY }, words);
  }
}
