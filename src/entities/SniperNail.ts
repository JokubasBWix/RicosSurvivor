import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { FONT_SNIPER } from '../game/FontLoader';
import nailGenericImg from '../assets/images/nail-generic.png';

export class SniperNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 35;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 15);
    this.fontFamily = FONT_SNIPER;
    this.fontSize = 28;

    if (!SniperNail.image) {
      SniperNail.image = new Image();
      SniperNail.image.onload = () => {
        SniperNail.imageLoaded = true;
      };
      SniperNail.image.src = nailGenericImg;
    }
  }

  update(deltaTime: number): void {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.velocity.y, this.velocity.x);

    if (SniperNail.imageLoaded && SniperNail.image) {
      const aspectRatio = SniperNail.image.width / SniperNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(angle + Math.PI * 1.35);
      ctx.drawImage(
        SniperNail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    this.renderWord(ctx);
  }
}
