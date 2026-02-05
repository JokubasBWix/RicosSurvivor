import { Position } from '../types';
import stumpImg from '../assets/images/stump.png';

export class TreeStump {
  public position: Position;
  public radius: number = 60;
  private canvas: HTMLCanvasElement;
  private image: HTMLImageElement;
  private imageLoaded: boolean = false;
  private imageSize: number = 120; // Size to render the image

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.position = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };
    
    // Load image
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
    };
    this.image.src = stumpImg;
  }

  update(deltaTime?: number, targetPosition?: Position): void {
    // TreeStump stays in center for now
    this.position.x = this.canvas.width / 2;
    this.position.y = this.canvas.height / 2;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.imageLoaded) {
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(Math.PI / 2); // Rotate 90 degrees to stand upright
      ctx.scale(-1, 1); // Flip horizontally
      ctx.drawImage(
        this.image,
        -this.imageSize / 2,
        -this.imageSize / 2,
        this.imageSize,
        this.imageSize
      );
      ctx.restore();
    } else {
      // Fallback while image loads
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  resize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }
}
