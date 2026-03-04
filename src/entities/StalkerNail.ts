import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { SeededRNG } from '../utils/SeededRNG';
import powerToolImg from '../assets/images/power-tool-generic.png';

const CHARGE_DISTANCE = 180;
const CHARGE_DURATION = 1.8;
const POUNCE_SPEED = 450;
const MAX_SHAKE = 8;
const TINT_FADE_SPEED = 1.5;

export class StalkerNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private static tintCanvas: OffscreenCanvas | null = null;
  private static tintCtx: OffscreenCanvasRenderingContext2D | null = null;
  private imageHeight: number = 90;

  private state: 'stalking' | 'charging' | 'pouncing' = 'stalking';
  private chargeTimer: number = 0;
  private facingAngle: number = 0;
  private tintLevel: number = 0;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 40);

    if (!StalkerNail.image) {
      StalkerNail.image = new Image();
      StalkerNail.image.onload = () => {
        StalkerNail.imageLoaded = true;
      };
      StalkerNail.image.src = powerToolImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);

    if (targetPosition) {
      const dx = targetPosition.x - this.position.x;
      const dy = targetPosition.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) this.facingAngle = Math.atan2(dy, dx);
    }

    if (this.state === 'stalking') {
      if (targetPosition) {
        this.homeToward(targetPosition, deltaTime);

        const dx = targetPosition.x - this.position.x;
        const dy = targetPosition.y - this.position.y;
        if (Math.sqrt(dx * dx + dy * dy) <= CHARGE_DISTANCE) {
          this.state = 'charging';
          this.chargeTimer = 0;
          this.velocity = { x: 0, y: 0 };
        }
      } else {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
      }
    } else if (this.state === 'charging') {
      this.chargeTimer += deltaTime;
      const progress = Math.min(this.chargeTimer / CHARGE_DURATION, 1);
      this.tintLevel = progress * progress * 0.65;

      if (this.chargeTimer >= CHARGE_DURATION && targetPosition) {
        const dx = targetPosition.x - this.position.x;
        const dy = targetPosition.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          this.velocity = {
            x: (dx / dist) * POUNCE_SPEED,
            y: (dy / dist) * POUNCE_SPEED
          };
        } else {
          this.velocity = { x: POUNCE_SPEED, y: 0 };
        }
        this.state = 'pouncing';
      }
    } else {
      this.tintLevel = Math.max(0, this.tintLevel - TINT_FADE_SPEED * deltaTime);
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    let shakeX = 0;
    let shakeY = 0;

    if (this.state === 'charging') {
      const progress = Math.min(this.chargeTimer / CHARGE_DURATION, 1);
      const intensity = progress * progress * MAX_SHAKE;
      shakeX = (Math.random() - 0.5) * 2 * intensity;
      shakeY = (Math.random() - 0.5) * 2 * intensity;
    }

    const drawX = this.position.x + shakeX;
    const drawY = this.position.y + shakeY;
    const renderAngle = this.state === 'pouncing'
      ? Math.atan2(this.velocity.y, this.velocity.x)
      : this.facingAngle;
    const facingRight = Math.abs(this.facingAngle) < Math.PI / 2;

    if (StalkerNail.imageLoaded && StalkerNail.image) {
      const aspectRatio = StalkerNail.image.width / StalkerNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      let srcImage: CanvasImageSource = StalkerNail.image;

      if (this.tintLevel > 0.001) {
        if (!StalkerNail.tintCanvas || StalkerNail.tintCanvas.width !== Math.ceil(imageWidth) || StalkerNail.tintCanvas.height !== Math.ceil(this.imageHeight)) {
          StalkerNail.tintCanvas = new OffscreenCanvas(Math.ceil(imageWidth), Math.ceil(this.imageHeight));
          StalkerNail.tintCtx = StalkerNail.tintCanvas.getContext('2d');
        }
        const tc = StalkerNail.tintCtx!;
        tc.clearRect(0, 0, StalkerNail.tintCanvas.width, StalkerNail.tintCanvas.height);
        tc.drawImage(StalkerNail.image, 0, 0, imageWidth, this.imageHeight);
        tc.globalCompositeOperation = 'source-atop';
        tc.fillStyle = `rgba(255, 30, 20, ${this.tintLevel})`;
        tc.fillRect(0, 0, imageWidth, this.imageHeight);
        tc.globalCompositeOperation = 'source-over';
        srcImage = StalkerNail.tintCanvas;
      }

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(renderAngle + Math.PI);
      if (facingRight) ctx.scale(1, -1);
      ctx.drawImage(
        srcImage,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 50, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 100, 255, 0.8)';
      ctx.lineWidth = 2;
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
    speedMax: number = 40,
    rng?: SeededRNG
  ): StalkerNail {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax, rng);
    return new StalkerNail(word, position, velocity);
  }
}
