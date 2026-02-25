import { Position } from '../types';
import stumpNeutral from '../assets/images/stumpy/stump_neutral.png';
import stumpAttack from '../assets/images/stumpy/stump_attack.png';
import stumpDead from '../assets/images/stumpy/stump_dead.png';

type StumpState = 'neutral' | 'attack' | 'dead';

const ATTACK_DURATION = 0.12; // seconds (~7 frames at 60fps)

export class TreeStump {
  public position: Position;
  public radius: number = 60;
  private canvas: HTMLCanvasElement;
  private imageSize: number = 120;

  private state: StumpState = 'neutral';
  private attackTimer: number = 0;

  private images: Record<StumpState, HTMLImageElement> = {} as any;
  private loaded: Record<StumpState, boolean> = { neutral: false, attack: false, dead: false };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.position = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };

    this.loadImage('neutral', stumpNeutral);
    this.loadImage('attack', stumpAttack);
    this.loadImage('dead', stumpDead);
  }

  private loadImage(state: StumpState, src: string): void {
    const img = new Image();
    img.onload = () => { this.loaded[state] = true; };
    img.src = src;
    this.images[state] = img;
  }

  triggerAttack(): void {
    if (this.state === 'dead') return;
    this.state = 'attack';
    this.attackTimer = ATTACK_DURATION;
  }

  setDead(): void {
    this.state = 'dead';
  }

  update(deltaTime?: number): void {
    this.position.x = this.canvas.width / 2;
    this.position.y = this.canvas.height / 2;

    if (this.state === 'attack' && deltaTime) {
      this.attackTimer -= deltaTime;
      if (this.attackTimer <= 0) {
        this.state = 'neutral';
        this.attackTimer = 0;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const img = this.images[this.state];
    if (img && this.loaded[this.state]) {
      ctx.drawImage(
        img,
        this.position.x - this.imageSize / 2,
        this.position.y - this.imageSize / 2,
        this.imageSize,
        this.imageSize
      );
    } else {
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
