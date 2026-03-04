import { Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import circularSawImg from '../assets/images/CircuralSaw.png';

const SPIN_RATE = 10;
const CORNER_MARGIN = 80;

export interface SpeedNailConfig {
  springK: number;
  orbitForce: number;
  drag: number;
  maxSpeed: number;
  startRadius: number;
  orbitLifetime: number;
  tangentAngle: number;
  innerRadius: number;
  innerBoostMult: number;
  decayPower: number;
}

export class SpeedNail extends BaseEnemy {
  static config: SpeedNailConfig = {
    springK: 5,
    orbitForce: 400,
    drag: 1.5,
    maxSpeed: 140,
    startRadius: 550,
    orbitLifetime: 18,
    tangentAngle: Math.PI / 7,
    innerRadius: 200,
    innerBoostMult: 12,
    decayPower: 0.5,
  };

  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageHeight: number = 55;
  private spinAngle: number = 0;
  private age: number = 0;
  private orbitDirection: number;

  constructor(word: string, position: Position, velocity: Velocity) {
    super(word, position, velocity, 22);

    const sign = Math.random() < 0.5 ? 1 : -1;
    this.orbitDirection = sign;

    const a = sign * SpeedNail.config.tangentAngle;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const { x, y } = this.velocity;
    this.velocity.x = x * c - y * s;
    this.velocity.y = x * s + y * c;

    this.spinAngle = Math.random() * Math.PI * 2;

    if (!SpeedNail.image) {
      SpeedNail.image = new Image();
      SpeedNail.image.onload = () => {
        SpeedNail.imageLoaded = true;
      };
      SpeedNail.image.src = circularSawImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);
    this.spinAngle += SPIN_RATE * deltaTime;
    this.age += deltaTime;

    if (targetPosition) {
      const dx = targetPosition.x - this.position.x;
      const dy = targetPosition.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const cfg = SpeedNail.config;
      const lifeProgress = Math.min(1, this.age / cfg.orbitLifetime);
      const targetRadius = cfg.startRadius * Math.pow(1 - lifeProgress, cfg.decayPower);

      if (dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const tx = -ny * this.orbitDirection;
        const ty = nx * this.orbitDirection;

        const radiusError = dist - targetRadius;
        const innerBoost = targetRadius < cfg.innerRadius ? cfg.innerBoostMult * (1 - targetRadius / cfg.innerRadius) : 0;
        const radialAccel = radiusError * (cfg.springK + innerBoost * cfg.springK);
        const orbitStrength = cfg.orbitForce * (1 - lifeProgress);

        this.velocity.x += (nx * radialAccel + tx * orbitStrength) * deltaTime;
        this.velocity.y += (ny * radialAccel + ty * orbitStrength) * deltaTime;
      }

      const damping = 1 - cfg.drag * deltaTime;
      this.velocity.x *= damping;
      this.velocity.y *= damping;

      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed > cfg.maxSpeed) {
        const scale = cfg.maxSpeed / speed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
      }
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (SpeedNail.imageLoaded && SpeedNail.image) {
      const aspectRatio = SpeedNail.image.width / SpeedNail.image.height;
      const imageWidth = this.imageHeight * aspectRatio;

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(this.spinAngle);
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

    this.renderWord(ctx);
  }

  static spawnFromCorner(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 100,
    speedMax: number = 140,
    cornerIndex?: number
  ): SpeedNail {
    const corners: Position[] = [
      { x: CORNER_MARGIN, y: CORNER_MARGIN },
      { x: canvas.width - CORNER_MARGIN, y: CORNER_MARGIN },
      { x: CORNER_MARGIN, y: canvas.height - CORNER_MARGIN },
      { x: canvas.width - CORNER_MARGIN, y: canvas.height - CORNER_MARGIN },
    ];

    const corner = corners[cornerIndex ?? Math.floor(Math.random() * corners.length)];

    const dx = targetX - corner.x;
    const dy = targetY - corner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const velocity: Velocity = dist > 0
      ? { x: (dx / dist) * speed, y: (dy / dist) * speed }
      : { x: speed, y: 0 };

    return new SpeedNail(word, { ...corner }, velocity);
  }

  static spawn360(
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMin: number = 100,
    speedMax: number = 140
  ): SpeedNail {
    return SpeedNail.spawnFromCorner(word, canvas, targetX, targetY, speedMin, speedMax);
  }
}
