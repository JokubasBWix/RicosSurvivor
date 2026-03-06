import { Position, Enemy } from '../types';
import leafGif from '../assets/projectiles/leaf.gif';

const SPEED = 800;
const ARRIVE_THRESHOLD = 15;

export class LeafProjectile {
  public position: Position;
  public arrived: boolean = false;
  public targetEnemy: Enemy;
  private el: HTMLImageElement;
  private canvas: HTMLCanvasElement;

  constructor(start: Position, targetEnemy: Enemy, canvas: HTMLCanvasElement) {
    this.position = { ...start };
    this.targetEnemy = targetEnemy;
    this.canvas = canvas;

    this.el = document.createElement('img');
    this.el.src = leafGif;
    this.el.style.position = 'fixed';
    this.el.style.top = '0';
    this.el.style.left = '0';
    this.el.style.pointerEvents = 'none';
    this.el.style.zIndex = '10';
    document.body.appendChild(this.el);

    this.syncTransform();
  }

  update(deltaTime: number, canvasRect?: DOMRect): void {
    if (this.arrived) return;

    const tx = this.targetEnemy.position.x;
    const ty = this.targetEnemy.position.y;
    const dx = tx - this.position.x;
    const dy = ty - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ARRIVE_THRESHOLD) {
      this.arrived = true;
      this.el.remove();
      return;
    }

    this.position.x += (dx / distance) * SPEED * deltaTime;
    this.position.y += (dy / distance) * SPEED * deltaTime;

    this.syncTransform(canvasRect);
  }

  private syncTransform(canvasRect?: DOMRect): void {
    const tx = this.targetEnemy.position.x;
    const ty = this.targetEnemy.position.y;
    const angle = Math.atan2(ty - this.position.y, tx - this.position.x);
    const deg = (angle * 180) / Math.PI + 180;

    const rect = canvasRect ?? this.canvas.getBoundingClientRect();
    const cssX = this.position.x * (rect.width / this.canvas.width);
    const cssY = this.position.y * (rect.height / this.canvas.height);
    const visualScale = rect.width / this.canvas.width;

    this.el.style.transform =
      `translate(${cssX}px, ${cssY}px) translate(-50%, -50%) rotate(${deg}deg) scale(${visualScale})`;
  }

  destroy(): void {
    this.el.remove();
  }
}
