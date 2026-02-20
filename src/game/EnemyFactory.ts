import { Enemy, EnemyType, Position } from '../types';
import { Nail } from '../entities/Nail';
import { ZigzagNail } from '../entities/ZigzagNail';
import { SpawnerNail } from '../entities/SpawnerNail';
import { TankNail } from '../entities/TankNail';
import { SpeedNail } from '../entities/SpeedNail';
import { Sniper } from '../entities/Sniper';

const DEFAULT_SPEEDS: Record<EnemyType, { min: number; max: number }> = {
  nail:    { min: 45, max: 80 },
  zigzag:  { min: 15, max: 25 },
  spawner: { min: 40, max: 60 },
  tank:    { min: 20, max: 35 },
  speed:   { min: 80, max: 120 },
  sniper:  { min: 30, max: 50 }
};

export class EnemyFactory {
  static create(
    type: EnemyType,
    word: string,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    words: string[] = []
  ): Enemy {
    const { min, max } = DEFAULT_SPEEDS[type];
    switch (type) {
      case 'nail':
        return Nail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'zigzag':
        return ZigzagNail.spawn360(word, canvas, targetX, targetY, min, max);
      case 'spawner':
        return SpawnerNail.spawn360(word, canvas, targetX, targetY, min, max, words);
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
    words: string[] = []
  ): Enemy {
    const dx = targetPos.x - spawnPos.x;
    const dy = targetPos.y - spawnPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speeds = DEFAULT_SPEEDS[type];
    const speed = speeds.min + Math.random() * (speeds.max - speeds.min);
    const velocity = distance > 0
      ? { x: (dx / distance) * speed, y: (dy / distance) * speed }
      : { x: 0, y: -speed };

    switch (type) {
      case 'nail':
        return new Nail(word, spawnPos, velocity);
      case 'zigzag':
        return new ZigzagNail(word, spawnPos, velocity);
      case 'spawner':
        return new SpawnerNail(word, spawnPos, velocity, targetPos, words);
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
