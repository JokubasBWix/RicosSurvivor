import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { SeededRNG } from '../utils/SeededRNG';
import hackSawImg from '../assets/images/hack-saw-generic.png';

export class ZigzagNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 85;
  private baseSpeed: number;
  private moveAngle: number;
  private sweepAngle: number;
  private sweepDirection: number;
  private sweepSpeed: number;
  private sweepRange: number;
  private steerSpeed: number = 2.5;
  private facingAngle: number = 0;
  private state: 'sweeping' | 'cooldown' = 'sweeping';
  private cooldownTimer: number = 0;
  private cooldownDuration: number = 0;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 32);

    this.baseSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    this.moveAngle = Math.atan2(velocity.y, velocity.x);
    this.sweepSpeed = 1.5 + Math.random() * 1;
    this.sweepRange = Math.PI / 1.5 + Math.random() * (Math.PI / 4);
    this.sweepAngle = 0;
    this.sweepDirection = Math.random() < 0.5 ? 1 : -1;

    if (!ZigzagNail.image) {
      ZigzagNail.image = new Image();
      ZigzagNail.image.onload = () => {
        ZigzagNail.imageLoaded = true;
      };
      ZigzagNail.image.src = hackSawImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);

    if (targetPosition) {
      const dx = targetPosition.x - this.position.x;
      const dy = targetPosition.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        this.facingAngle = Math.atan2(dy, dx);

        if (this.state === 'sweeping') {
          this.sweepAngle += this.sweepDirection * this.sweepSpeed * deltaTime;
          if (Math.abs(this.sweepAngle) >= this.sweepRange) {
            this.sweepAngle = Math.sign(this.sweepAngle) * this.sweepRange;
            this.sweepDirection *= -1;
            this.state = 'cooldown';
            this.cooldownDuration = 0.4 + Math.random() * 0.4;
            this.cooldownTimer = 0;
          }

          const targetAngle = this.facingAngle + this.sweepAngle;
          let angleDiff = targetAngle - this.moveAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          this.moveAngle += angleDiff * this.steerSpeed * deltaTime;

          const sweepProgress = Math.abs(this.sweepAngle) / this.sweepRange;
          const speed = this.baseSpeed * (2 + 22.5 * (1 - sweepProgress));

          this.velocity.x = Math.cos(this.moveAngle) * speed;
          this.velocity.y = Math.sin(this.moveAngle) * speed;
        } else {
          this.cooldownTimer += deltaTime;

          let angleDiff = this.facingAngle - this.moveAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          this.moveAngle += angleDiff * 0.4 * deltaTime;

          const driftSpeed = this.baseSpeed * 1.5;
          this.velocity.x = Math.cos(this.moveAngle) * driftSpeed;
          this.velocity.y = Math.sin(this.moveAngle) * driftSpeed;

          if (this.cooldownTimer >= this.cooldownDuration) {
            this.state = 'sweeping';
            this.sweepAngle = 0;
          }
        }
      }
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (ZigzagNail.imageLoaded && ZigzagNail.image) {
      const aspectRatio = ZigzagNail.image.width / ZigzagNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;
      const moveAngle = Math.atan2(this.velocity.y, this.velocity.x);
      const facingRight = Math.abs(this.facingAngle) < Math.PI / 2;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(moveAngle + Math.PI);
      if (facingRight) ctx.scale(1, -1);
      ctx.drawImage(
        ZigzagNail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 150, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    this.renderWord(ctx);
  }

  static spawnFromSide(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 35,
    speedMax: number = 55,
    rng?: SeededRNG
  ): ZigzagNail {
    const rand = rng ? () => rng.next() : Math.random;
    const margin = 60;
    const left = rand() < 0.5;
    const x = left ? -margin : canvas.width + margin;
    const y = rand() * canvas.height;

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = speedMin + rand() * (speedMax - speedMin);
    const velocity: Velocity = dist > 0
      ? { x: (dx / dist) * speed, y: (dy / dist) * speed }
      : { x: speed, y: 0 };

    return new ZigzagNail(word, { x, y }, velocity);
  }

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 35,
    speedMax: number = 55,
    rng?: SeededRNG
  ): ZigzagNail {
    return ZigzagNail.spawnFromSide(word, canvas, targetX, targetY, speedMin, speedMax, rng);
  }
}
