import { Enemy, Position, Velocity } from '../types';
import { BaseEnemy } from './BaseEnemy';
import { FONT_SNIPER } from '../game/FontLoader';
import { SniperNail } from './SniperNail';
import nailgunImg from '../assets/images/nailgun.png';

export class Sniper extends BaseEnemy {
  private static image: HTMLImageElement | null = null;
  private static imageLoaded: boolean = false;
  private imageSize: number = 140;

  private stopPosition: Position;
  private hasReachedStop: boolean = false;
  private shootTimer: number = 0;
  private burstCount: number = 0;
  private burstShotsFired: number = 0;
  private isBurstActive: boolean = false;
  private readonly maxBursts = 4;
  private readonly shotsPerBurst = 3;
  private readonly burstShotInterval = 150;
  private readonly burstPause = 2000;
  private burstSpeed: number = 0;
  private ammoEmpty: boolean = false;
  private chargeDelay: number = 0;
  private static readonly CHARGE_DELAY = 1.0;
  private chargeSpeed: number = 80;
  private recoilX: number = 0;
  private recoilY: number = 0;
  private static readonly RECOIL_DECAY = 15;
  private static readonly FAN_SPREAD = 0.25;
  private static readonly AIM_LERP_SPEED = 8;
  private aimAngle: number = 0;
  private targetAimAngle: number = 0;
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
    super(word, position, velocity, 50);
    this.fontFamily = FONT_SNIPER;
    this.fontSize = 30;
    this.displayUppercase = true;
    this.playerPosition = { ...playerPosition };
    this.words = words;

    this.aimAngle = Math.atan2(playerPosition.y - position.y, playerPosition.x - position.x);
    this.targetAimAngle = this.aimAngle;

    const angle = Math.atan2(position.y - playerPosition.y, position.x - playerPosition.x);
    const stopDistance = 500 + Math.random() * 150;
    const margin = 100;
    this.stopPosition = {
      x: Math.max(margin, Math.min(window.innerWidth - margin, playerPosition.x + Math.cos(angle) * stopDistance)),
      y: Math.max(margin, Math.min(window.innerHeight - margin, playerPosition.y + Math.sin(angle) * stopDistance))
    };

    if (!Sniper.image) {
      Sniper.image = new Image();
      Sniper.image.onload = () => {
        Sniper.imageLoaded = true;
      };
      Sniper.image.src = nailgunImg;
    }
  }

  update(deltaTime: number, targetPosition?: Position): void {
    this.updateScale(deltaTime);
    if (targetPosition) {
      this.playerPosition = { ...targetPosition };
    }

    const recoilFalloff = Math.exp(-Sniper.RECOIL_DECAY * deltaTime);
    this.recoilX *= recoilFalloff;
    this.recoilY *= recoilFalloff;

    const barrelLocal = { x: -20, y: -25 };
    const cosA = Math.cos(this.aimAngle + Math.PI);
    const sinA = Math.sin(this.aimAngle + Math.PI);
    const facingRight = Math.abs(this.aimAngle) < Math.PI / 2;
    const flipY = facingRight ? -1 : 1;
    const barrelX = this.position.x + cosA * barrelLocal.x - sinA * barrelLocal.y * flipY;
    const barrelY = this.position.y + sinA * barrelLocal.x + cosA * barrelLocal.y * flipY;

    const baseAngleToPlayer = Math.atan2(
      this.playerPosition.y - barrelY,
      this.playerPosition.x - barrelX
    );

    if (this.isBurstActive) {
      const fanOffset = (this.burstShotsFired - (this.shotsPerBurst - 1) / 2) * Sniper.FAN_SPREAD;
      this.targetAimAngle = baseAngleToPlayer + fanOffset;
    } else {
      this.targetAimAngle = baseAngleToPlayer;
    }

    let angleDiff = this.targetAimAngle - this.aimAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.aimAngle += angleDiff * Math.min(1, Sniper.AIM_LERP_SPEED * deltaTime);

    this.pendingSpawns = [];

    if (!this.hasReachedStop) {
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
    } else if (this.ammoEmpty) {
      this.chargeDelay -= deltaTime;
      if (this.chargeDelay <= 0) {
        const dx = this.playerPosition.x - this.position.x;
        const dy = this.playerPosition.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.velocity.x = (dx / dist) * this.chargeSpeed;
        this.velocity.y = (dy / dist) * this.chargeSpeed;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
      }
    } else {
      this.shootTimer += deltaTime * 1000;

      if (this.isBurstActive) {
        if (this.shootTimer >= this.burstShotInterval) {
          this.shootSniperNail();
          this.shootTimer = 0;
          this.burstShotsFired++;

          if (this.burstShotsFired >= this.shotsPerBurst) {
            this.isBurstActive = false;
            this.burstCount++;
            this.shootTimer = 0;

            if (this.burstCount >= this.maxBursts) {
              this.ammoEmpty = true;
              this.chargeDelay = Sniper.CHARGE_DELAY;
            }
          }
        }
      } else if (this.burstCount < this.maxBursts) {
        if (this.shootTimer >= this.burstPause) {
          this.isBurstActive = true;
          this.burstShotsFired = 0;
          this.burstSpeed = 120 + Math.random() * 60;
          this.shootTimer = 0;
        }
      }
    }
  }

  private shootSniperNail(): void {
    const word = this.words[Math.floor(Math.random() * this.words.length)];
    const jitter = (Math.random() - 0.5) * 0.06;
    const velocity = {
      x: Math.cos(this.aimAngle + jitter) * this.burstSpeed,
      y: Math.sin(this.aimAngle + jitter) * this.burstSpeed,
    };

    const localX = -20;
    const localY = -25;
    const cosA = Math.cos(this.aimAngle + Math.PI);
    const sinA = Math.sin(this.aimAngle + Math.PI);
    const facingRight = Math.abs(this.aimAngle) < Math.PI / 2;
    const flipY = facingRight ? -1 : 1;
    const spawnX = this.position.x + cosA * localX - sinA * localY * flipY;
    const spawnY = this.position.y + sinA * localX + cosA * localY * flipY;
    const child = new SniperNail(word, { x: spawnX, y: spawnY }, velocity);
    this.pendingSpawns.push(child);

    const knockbackStrength = 12;
    this.recoilX -= Math.cos(this.aimAngle) * knockbackStrength;
    this.recoilY -= Math.sin(this.aimAngle) * knockbackStrength;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (Sniper.imageLoaded && Sniper.image) {
      const aspectRatio = Sniper.image.width / Sniper.image.height;
      const imgW = this.imageSize * aspectRatio;
      const imgH = this.imageSize;

      ctx.save();
      ctx.translate(this.position.x + this.recoilX, this.position.y + this.recoilY);
      ctx.rotate(this.aimAngle + Math.PI);
      if (Math.abs(this.aimAngle) < Math.PI / 2) ctx.scale(1, -1);
      ctx.drawImage(Sniper.image, -imgW / 2, -imgH / 2, imgW, imgH);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 180, 30, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(50, 220, 50, 0.9)';
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
    speedMin: number = 30,
    speedMax: number = 50,
    words: string[] = []
  ): Sniper {
    const { position, velocity } = BaseEnemy.computeSpawn360(canvas, targetX, targetY, speedMin, speedMax);
    return new Sniper(word, position, velocity, { x: targetX, y: targetY }, words);
  }
}
