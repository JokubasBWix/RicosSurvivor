import { Enemy, Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { Nail } from './Nail';
import powerToolImg from '../assets/images/power-tool-generic.png';

export class SpawnerNail extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 55;

  private stopPosition: Position;
  private hasReachedStop: boolean = false;
  private spawnTimer: number = 0;
  private childSpawnInterval: number = 3000;
  private maxChildren: number = 5;
  private childrenSpawned: number = 0;
  public pendingSpawns: Enemy[] = [];

  private playerPosition: Position;
  private words: string[];

  constructor(
    word: string,
    position: Position,
    velocity: Velocity,
    playerPosition: Position,
    words: string[]
  ) {
    super(word, position, velocity, 25);
    this.playerPosition = { ...playerPosition };
    this.words = words;

    // Stop at a point 200-350px away from the player
    const angle = Math.atan2(position.y - playerPosition.y, position.x - playerPosition.x);
    const stopDistance = 200 + Math.random() * 150;
    this.stopPosition = {
      x: playerPosition.x + Math.cos(angle) * stopDistance,
      y: playerPosition.y + Math.sin(angle) * stopDistance
    };

    if (!SpawnerNail.image) {
      SpawnerNail.image = new Image();
      SpawnerNail.image.onload = () => {
        SpawnerNail.imageLoaded = true;
      };
      SpawnerNail.image.src = powerToolImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    if (targetPosition) {
      this.playerPosition = { ...targetPosition };
    }

    this.pendingSpawns = [];

    if (!this.hasReachedStop) {
      // Move toward the stop position (not the player)
      const dx = this.stopPosition.x - this.position.x;
      const dy = this.stopPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        this.hasReachedStop = true;
        this.velocity = { x: 0, y: 0 };
      } else {
        const speed = this.getSpeed();
        this.velocity.x = (dx / distance) * speed;
        this.velocity.y = (dy / distance) * speed;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
      }
    } else {
      // Spawn children periodically
      this.spawnTimer += deltaTime * 1000;
      if (this.spawnTimer >= this.childSpawnInterval && this.childrenSpawned < this.maxChildren) {
        this.spawnChild();
        this.spawnTimer = 0;
        this.childrenSpawned++;
      }
    }
  }

  private spawnChild(): void {
    const word = this.words[Math.floor(Math.random() * this.words.length)];
    const dx = this.playerPosition.x - this.position.x;
    const dy = this.playerPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 30 + Math.random() * 20;

    const velocity =
      distance > 0
        ? { x: (dx / distance) * speed, y: (dy / distance) * speed }
        : { x: speed, y: 0 };

    const child = new Nail(word, { ...this.position }, velocity);
    this.pendingSpawns.push(child);
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Pulsing glow while actively spawning
    if (this.hasReachedStop) {
      const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.3})`;
      ctx.fill();
    }

    const angle = Math.atan2(this.velocity.y, this.velocity.x);

    if (SpawnerNail.imageLoaded && SpawnerNail.image) {
      const aspectRatio = SpawnerNail.image.width / SpawnerNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      if (!this.hasReachedStop) {
        ctx.rotate(angle + Math.PI / 2);
      }
      ctx.drawImage(
        SpawnerNail.image,
        -imageWidth / 2,
        -this.imageHeight / 2,
        imageWidth,
        this.imageHeight
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 50, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 100, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    this.renderWord(ctx);

    // Show spawn counter
    if (this.hasReachedStop) {
      ctx.font = `10px "${this.fontFamily}", monospace`;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${this.childrenSpawned}/${this.maxChildren}`,
        this.position.x,
        this.position.y + this.radius + 15
      );
    }
  }

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 40,
    speedMax: number = 60,
    words: string[] = []
  ): SpawnerNail {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new SpawnerNail(word, position, velocity, { x: targetX, y: targetY }, words);
  }
}
