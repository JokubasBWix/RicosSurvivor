import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import nailImg from '../assets/images/nail.png';

export class Nail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 50;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 20);

    if (!Nail.image) {
      Nail.image = new Image();
      Nail.image.onload = () => {
        Nail.imageLoaded = true;
      };
      Nail.image.src = nailImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);
    if (targetPosition) {
      this.homeToward(targetPosition, deltaTime);
    } else {
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.velocity.y, this.velocity.x);

    if (Nail.imageLoaded && Nail.image) {
      const aspectRatio = Nail.image.width / Nail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(
        Nail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 100, 50, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 150, 100, 0.8)';
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
    speedMin: number = 45,
    speedMax: number = 80
  ): Nail {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new Nail(word, position, velocity);
  }
}
