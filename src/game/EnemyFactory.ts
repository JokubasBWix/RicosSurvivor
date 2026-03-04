import { Enemy, EnemyType, Position } from '../types';
import { Nail } from '../entities/Nail';
import { ZigzagNail } from '../entities/ZigzagNail';
import { StalkerNail } from '../entities/StalkerNail';
import { TankNail } from '../entities/TankNail';
import { SpeedNail } from '../entities/SpeedNail';
import { Sniper } from '../entities/Sniper';

const DEFAULT_SPEEDS: Record<EnemyType, { min: number; max: number }> = {
  nail:    { min: 45, max: 80 },
  zigzag:  { min: 15, max: 25 },
  stalker: { min: 20, max: 40 },
  tank:    { min: 20, max: 35 },
  speed:   { min: 100, max: 140 },
  sniper:  { min: 30, max: 50 }
};

export class EnemyFactory {
  static getSpeedRange(type: EnemyType, multiplier: number = 1.0): { min: number; max: number } {
    const base = DEFAULT_SPEEDS[type];
    return { min: base.min * multiplier, max: base.max * multiplier };
  }

  static create(
    type: EnemyType,
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    words: string[] = [],
    speedMultiplier: number = 1.0
  ): Enemy {
    const base = DEFAULT_SPEEDS[type];
    const min = base.min * speedMultiplier;
    const max = base.max * speedMultiplier;
    switch (type) {
      case 'nail':
        return Nail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'zigzag':
        return ZigzagNail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'stalker':
        return StalkerNail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'tank':
        return TankNail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'speed':
        return SpeedNail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'sniper':
        return Sniper.spawn360(word, canvas, targetX, targetY, min, max, words);
      default:
        return Nail.spawn360(word, canvas, targetX, targetY, min, max);
    }
  }

  static createAtPosition(
    type: EnemyType,
    word: string,
    spawnPos: Position,
    targetPos: Position,
    words: string[] = [],
    speedMultiplier: number = 1.0
  ): Enemy {
    const dx = targetPos.x - spawnPos.x;
    const dy = targetPos.y - spawnPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const base = DEFAULT_SPEEDS[type];
    const min = base.min * speedMultiplier;
    const max = base.max * speedMultiplier;
    const speed = min + Math.random() * (max - min);
    const velocity = distance > 0
      ? { x: (dx / distance) * speed, y: (dy / distance) * speed }
      : { x: 0, y: -speed };

    switch (type) {
      case 'nail':
        return new Nail(word, spawnPos, velocity);
      case 'zigzag':
        return new ZigzagNail(word, spawnPos, velocity);
      case 'stalker':
        return new StalkerNail(word, spawnPos, velocity);
      case 'tank':
        return new TankNail(word, spawnPos, velocity);
      case 'speed':
        return new SpeedNail(word, spawnPos, velocity);
      case 'sniper':
        return new Sniper(word, spawnPos, velocity, targetPos, words);
      default:
        return new Nail(word, spawnPos, velocity);
    }
  }
}
