import { Enemy, Position, Velocity } from '../types';

export abstract class BaseEnemy implements Enemy {
  public position: Position;
  public velocity: Velocity;
  public word: string;
  public typed: string = '';
  public radius: number;
  public isDestroyed: boolean = false;

  constructor(word: string, position: Position, velocity: Velocity, radius: number = 20) {
    this.word = word;
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.radius = radius;
  }

  abstract update(deltaTime: number, targetPosition?: Position): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  isOffScreen(canvas: HTMLCanvasElement): boolean {
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

  protected renderWord(ctx: CanvasRenderingContext2D): void {
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const untypedPart = this.word.substring(this.typed.length);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillText(
      untypedPart,
      this.position.x + this.typed.length * 5,
      this.position.y - this.radius - 20
    );

    if (this.typed.length > 0) {
      ctx.fillStyle = '#11882a';
      ctx.fillText(
        this.typed,
        this.position.x - untypedPart.length * 5,
        this.position.y - this.radius - 20
      );
    }
  }

  protected homeToward(targetPosition: Position, deltaTime: number): void {
    const dx = targetPosition.x - this.position.x;
    const dy = targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const speed = this.getSpeed();
      this.velocity.x = (dx / distance) * speed;
      this.velocity.y = (dy / distance) * speed;
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  protected getSpeed(): number {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
  }

  static computeSpawn360(
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number,
    speedMax: number
  ): { position: Position; velocity: Velocity } {
    const angle = Math.random() * Math.PI * 2;
    const spawnDistance = Math.max(canvas.width, canvas.height) * 0.6;
    const startX = targetX + Math.cos(angle) * spawnDistance;
    const startY = targetY + Math.sin(angle) * spawnDistance;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = speedMin + Math.random() * (speedMax - speedMin);

    return {
      position: { x: startX, y: startY },
      velocity: { x: (dx / distance) * speed, y: (dy / distance) * speed }
    };
  }
}
