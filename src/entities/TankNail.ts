import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import axeImg from '../assets/images/axe-generic.png';

export class TankNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 70;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 35);

    if (!TankNail.image) {
      TankNail.image = new Image();
      TankNail.image.onload = () => {
        TankNail.imageLoaded = true;
      };
      TankNail.image.src = axeImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    if (targetPosition) {
      this.homeToward(targetPosition, deltaTime);
    } else {
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.velocity.y, this.velocity.x);

    if (TankNail.imageLoaded && TankNail.image) {
      const aspectRatio = TankNail.image.width / TankNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(angle + Math.PI / 2);
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
