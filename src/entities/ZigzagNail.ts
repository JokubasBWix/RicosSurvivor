import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import hackSawImg from '../assets/images/hack-saw-generic.png';

export class ZigzagNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 85;
  private oscillationTimer: number = 0;
  private oscillationFrequency: number;
  private oscillationAmplitude: number;
  private baseSpeed: number;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 32);

    this.baseSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    this.oscillationFrequency = 2 + Math.random() * 2;
    this.oscillationAmplitude = 60 + Math.random() * 40;

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
    this.oscillationTimer += deltaTime;

    if (targetPosition) {
      const dx = targetPosition.x - this.position.x;
      const dy = targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const speed = this.baseSpeed;
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Perpendicular direction for zigzag
        const perpX = -dirY;
        const perpY = dirX;

        const oscOffset = Math.sin(this.oscillationTimer * this.oscillationFrequency * Math.PI * 2);
        const lateralSpeed = oscOffset * this.oscillationAmplitude;

        this.velocity.x = dirX * speed + perpX * lateralSpeed;
        this.velocity.y = dirY * speed + perpY * lateralSpeed;
      }
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.velocity.y, this.velocity.x);

    if (ZigzagNail.imageLoaded && ZigzagNail.image) {
      const aspectRatio = ZigzagNail.image.width / ZigzagNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(angle + Math.PI / 2);
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

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 35,
    speedMax: number = 55
  ): ZigzagNail {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new ZigzagNail(word, position, velocity);
  }
}
