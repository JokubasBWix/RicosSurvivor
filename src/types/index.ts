export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Entity {
  position: Position;
  update(deltaTime: number, targetPosition?: Position): void;
  render(ctx: CanvasRenderingContext2D): void;
  isOffScreen(canvas: HTMLCanvasElement): boolean;
}

export interface Enemy extends Entity {
  word: string;
  typed: string;
  velocity: Velocity;
  radius: number;
  isDestroyed: boolean;
  wordCompleted: boolean;
  checkCollision(player: { position: Position; radius: number }): boolean;
}

export type EnemyType = 'nail' | 'zigzag' | 'spawner' | 'tank' | 'speed' | 'sniper';

export interface WaveEnemyConfig {
  type: EnemyType;
  count: number;
  spawnInterval: number;
}

export interface WaveConfig {
  wave: number;
  enemies: WaveEnemyConfig[];
}

export interface WavesData {
  waves: WaveConfig[];
}

export enum GameState {
  PLAYING,
  GAME_OVER,
  PAUSED
}
