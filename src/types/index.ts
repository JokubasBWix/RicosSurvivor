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
  typedScale: number;
  isMinion: boolean;
  isTargeted: boolean;
  checkCollision(player: { position: Position; radius: number }): boolean;
}

export type EnemyType = 'nail' | 'zigzag' | 'stalker' | 'tank' | 'speed' | 'sniper';

export enum GameState {
  START_SCREEN,
  PLAYING,
  DYING,
  GAME_OVER,
  PAUSED
}
