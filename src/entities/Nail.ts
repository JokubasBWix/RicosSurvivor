import { Enemy, Position, Velocity } from '../types';
import nailImg from '../assets/images/nail.png';

export class Nail implements Enemy {
  public position: Position;
  public velocity: Velocity;
  public word: string;
  public typed: string = '';
  public radius: number = 20;
  public isDestroyed: boolean = false;
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 50; // Height of nail when rendered

  constructor(word: string, position: Position, velocity: Velocity) {
    this.word = word;
    this.position = position;
    this.velocity = velocity;
    
    // Load image once (shared across all nails)
    if (!Nail.image) {
      Nail.image = new Image();
      Nail.image.onload = () => {
        Nail.imageLoaded = true;
      };
      Nail.image.src = nailImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    // Update velocity to always point toward target (player) BEFORE moving
    if (targetPosition) {
      const dx = targetPosition.x - this.position.x;
      const dy = targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        this.velocity.x = (dx / distance) * speed;
        this.velocity.y = (dy / distance) * speed;
      }
    }
    
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Calculate angle to point toward direction of movement
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    
    // Draw nail image
    if (Nail.imageLoaded && Nail.image) {
      // Calculate width based on aspect ratio
      const aspectRatio = Nail.image.width / Nail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;
      
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(angle + Math.PI / 2); // Rotate 90 degrees from velocity direction
      ctx.drawImage(
        Nail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      // Fallback while image loads
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 100, 50, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 150, 100, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw word
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Untyped part
    const untypedPart = this.word.substring(this.typed.length);
    ctx.fillStyle = 'white';
    ctx.fillText(
      untypedPart,
      this.position.x + this.typed.length * 5,
      this.position.y - this.radius - 20
    );

    // Typed part (green)
    if (this.typed.length > 0) {
      ctx.fillStyle = 'lime';
      ctx.fillText(
        this.typed,
        this.position.x - untypedPart.length * 5,
        this.position.y - this.radius - 20
      );
    }
  }

  isOffScreen(canvas: HTMLCanvasElement): boolean {
    // Large margin to allow enemies to spawn off-screen and travel toward player
    const margin = Math.max(canvas.width, canvas.height);
    return (
      this.position.x < -margin ||
      this.position.x > canvas.width + margin ||
      this.position.y < -margin ||
      this.position.y > canvas.height + margin
    );
  }

  checkCollision(player: { position: Position; radius: number }): boolean {
    const dx = this.position.x - player.position.x;
    const dy = this.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + player.radius;
  }

  static spawn360(word: string, canvas: HTMLCanvasElement, targetX: number, targetY: number): Nail {
    // Random angle in radians (0 to 2π)
    const angle = Math.random() * Math.PI * 2;
    
    // Spawn distance from center
    const spawnDistance = Math.max(canvas.width, canvas.height) * 0.6;
    
    // Starting position (off-screen at angle)
    const startX = targetX + Math.cos(angle) * spawnDistance;
    const startY = targetY + Math.sin(angle) * spawnDistance;
    
    // Calculate velocity towards center
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Speed varies based on difficulty (faster now)
    const speed = 45 + Math.random() * 35; // pixels per second
    
    const velocity = {
      x: (dx / distance) * speed,
      y: (dy / distance) * speed
    };
    
    return new Nail(word, { x: startX, y: startY }, velocity);
  }
}
