import { Position, Enemy } from '../types';
import leafGif from '../assets/projectiles/leaf.gif';

const SPEED = 400;
const ARRIVE_THRESHOLD = 15;

export class LeafProjectile {
  public position: Position;
  public arrived: boolean = false;
  public targetEnemy: Enemy;
  private el: HTMLImageElement;

  constructor(start: Position, targetEnemy: Enemy) {
    this.position = { ...start };
    this.targetEnemy = targetEnemy;

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

  update(deltaTime: number): void {
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

    this.syncTransform();
  }

  private syncTransform(): void {
    const tx = this.targetEnemy.position.x;
    const ty = this.targetEnemy.position.y;
    const angle = Math.atan2(ty - this.position.y, tx - this.position.x);
    const deg = (angle * 180) / Math.PI + 180;

    this.el.style.transform =
      `translate(${this.position.x}px, ${this.position.y}px) translate(-50%, -50%) rotate(${deg}deg)`;
  }

  destroy(): void {
    this.el.remove();
  }
}
