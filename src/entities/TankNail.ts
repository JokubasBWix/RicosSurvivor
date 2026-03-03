import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { FONT_TANK } from '../game/FontLoader';
import axeImg from '../assets/images/axe-generic.png';

const SPIN_DURATION = 2.5;
const SPIN_SPEED_MIN = 2;
const SPIN_SPEED_MAX = 30;
const DASH_SPEED = 450;
const DASH_DURATION = 3;
const TWO_PI = Math.PI * 2;

export class TankNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 110;

  private state: 'spinning' | 'dashing' = 'spinning';
  private spinAngle: number = 0;
  private spinSpeed: number = SPIN_SPEED_MIN;
  private spinTimer: number = 0;
  private dashAngle: number = 0;
  private dashTimer: number = 0;

  public pendingEvents: string[] = [];

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 55);
    this.fontFamily = FONT_TANK;
    this.fontSize = 32;
    this.velocity = { x: 0, y: 0 };

    if (!TankNail.image) {
      TankNail.image = new Image();
      TankNail.image.onload = () => {
        TankNail.imageLoaded = true;
      };
      TankNail.image.src = axeImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);

    if (this.state === 'spinning') {
      this.velocity.x = 0;
      this.velocity.y = 0;

      this.spinTimer += deltaTime;
      const t = Math.min(this.spinTimer / SPIN_DURATION, 1);
      this.spinSpeed = SPIN_SPEED_MIN + (SPIN_SPEED_MAX - SPIN_SPEED_MIN) * t * t;
      this.spinAngle += this.spinSpeed * deltaTime;

      if (this.spinTimer >= SPIN_DURATION && targetPosition) {
        this.dashAngle = Math.atan2(
          targetPosition.y - this.position.y,
          targetPosition.x - this.position.x
        );
        this.dashTimer = 0;
        this.state = 'dashing';
        this.pendingEvents.push('dash');
      }
    } else {
      this.dashTimer += deltaTime;
      const progress = Math.min(this.dashTimer / DASH_DURATION, 1);
      const ease = (1 - progress) * (1 - progress);
      const currentSpeed = DASH_SPEED * ease;

      this.velocity.x = Math.cos(this.dashAngle) * currentSpeed;
      this.velocity.y = Math.sin(this.dashAngle) * currentSpeed;
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;

      this.spinSpeed = Math.max(SPIN_SPEED_MIN, SPIN_SPEED_MAX * ease);
      this.spinAngle += this.spinSpeed * deltaTime;

      if (this.dashTimer >= DASH_DURATION) {
        this.spinTimer = 0;
        this.state = 'spinning';
        this.pendingEvents.push('spin');
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (TankNail.imageLoaded && TankNail.image) {
      const aspectRatio = TankNail.image.width / TankNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(this.spinAngle);
      ctx.drawImage(
        TankNail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    this.renderWord(ctx);
  }

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 20,
    speedMax: number = 35
  ): TankNail {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new TankNail(word, position, velocity);
  }
}
