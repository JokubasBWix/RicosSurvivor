import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import crosscutSawImg from '../assets/images/crosscut-saw-generic.png';

export class SpeedNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 35;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 14);

    if (!SpeedNail.image) {
      SpeedNail.image = new Image();
      SpeedNail.image.onload = () => {
        SpeedNail.imageLoaded = true;
      };
      SpeedNail.image.src = crosscutSawImg;
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

    if (SpeedNail.imageLoaded && SpeedNail.image) {
      const aspectRatio = SpeedNail.image.width / SpeedNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(
        SpeedNail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(50, 255, 50, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Speed trail effect
    const trailAngle = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI;
    for (let i = 1; i <= 3; i++) {
      const trailX = this.position.x + Math.cos(trailAngle) * i * 8;
      const trailY = this.position.y + Math.sin(trailAngle) * i * 8;
      ctx.beginPath();
      ctx.arc(trailX, trailY, this.radius * (1 - i * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50, 255, 50, ${0.15 - i * 0.04})`;
      ctx.fill();
    }

    this.renderWord(ctx);
  }

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 80,
    speedMax: number = 120
  ): SpeedNail {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new SpeedNail(word, position, velocity);
  }
}
