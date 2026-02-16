import { Enemy, EnemyType, Position, WaveConfig, WaveEnemyConfig } from '../types';
import { EnemyFactory } from './EnemyFactory';
import { SpawnerNail } from '../entities/SpawnerNail';
import wavesData from '../data/waves.json';

export enum WaveState {
  ACTIVE,
  TRANSITIONING,
  ALL_COMPLETE
}

interface SpawnTracker {
  config: WaveEnemyConfig;
  spawned: number;
  timer: number;
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  private currentWaveIndex: number = 0;
  private waveState: WaveState = WaveState.TRANSITIONING;
  private spawnTrackers: SpawnTracker[] = [];
  private transitionTimer: number = 0;
  private transitionDuration: number = 3000;
  private words: string[];
  private waves: WaveConfig[];
  private waveAnnouncementProgress: number = 0;
  private _debugMode: boolean = false;

  constructor(words: string[]) {
    this.words = words;
    this.waves = wavesData.waves as WaveConfig[];
    this.startWave(0);
  }

  get debugMode(): boolean {
    return this._debugMode;
  }

  set debugMode(value: boolean) {
    this._debugMode = value;
    if (value) {
      this.enemies = [];
    }
  }

  spawnAtPosition(type: EnemyType, spawnPos: Position, targetPos: Position): void {
    const word = this.getWordForType(type);
    const enemy = EnemyFactory.createAtPosition(type, word, spawnPos, targetPos, this.words);
    this.enemies.push(enemy);
  }

  clearEnemies(): void {
    this.enemies = [];
  }

  private startWave(index: number): void {
    this.currentWaveIndex = index;
    this.waveState = WaveState.TRANSITIONING;
    this.transitionTimer = 0;
    this.waveAnnouncementProgress = 0;
    this.spawnTrackers = [];

    if (index < this.waves.length) {
      const wave = this.waves[index];
      for (const enemyConfig of wave.enemies) {
        this.spawnTrackers.push({
          config: enemyConfig,
          spawned: 0,
          timer: 0
        });
      }
    }
  }

  get currentWave(): number {
    return this.currentWaveIndex + 1;
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getWaveState(): WaveState {
    return this.waveState;
  }

  update(
    deltaTime: number,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number
  ): void {
    // In debug mode, only update existing enemies (no wave logic)
    if (this._debugMode) {
      this.updateEnemies(deltaTime, canvas, targetX, targetY);
      return;
    }

    if (this.waveState === WaveState.TRANSITIONING) {
      this.transitionTimer += deltaTime * 1000;
      this.waveAnnouncementProgress = Math.min(1, this.transitionTimer / this.transitionDuration);
      if (this.transitionTimer >= this.transitionDuration) {
        this.waveState = WaveState.ACTIVE;
      }
      return;
    }

    if (this.waveState === WaveState.ALL_COMPLETE) {
      return;
    }

    // Spawn enemies according to wave config
    let allSpawned = true;
    for (const tracker of this.spawnTrackers) {
      if (tracker.spawned < tracker.config.count) {
        allSpawned = false;
        tracker.timer += deltaTime * 1000;

        if (tracker.timer >= tracker.config.spawnInterval) {
          const word = this.getWordForType(tracker.config.type);
          const enemy = EnemyFactory.create(
            tracker.config.type,
            word,
            canvas,
            targetX,
            targetY,
            tracker.config.speedMin,
            tracker.config.speedMax,
            this.words
          );
          this.enemies.push(enemy);
          tracker.spawned++;
          tracker.timer = 0;
        }
      }
    }

    this.updateEnemies(deltaTime, canvas, targetX, targetY);

    // Advance wave when all enemies spawned and cleared
    if (allSpawned && this.enemies.length === 0) {
      this.advanceWave();
    }
  }

  private updateEnemies(
    deltaTime: number,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number
  ): void {
    for (const enemy of this.enemies) {
      enemy.update(deltaTime, { x: targetX, y: targetY });

      if (enemy instanceof SpawnerNail && enemy.pendingSpawns.length > 0) {
        this.enemies.push(...enemy.pendingSpawns);
        enemy.pendingSpawns = [];
      }
    }

    this.enemies = this.enemies.filter(
      enemy => !enemy.isDestroyed && !enemy.isOffScreen(canvas)
    );
  }

  private advanceWave(): void {
    const nextIndex = this.currentWaveIndex + 1;
    if (nextIndex < this.waves.length) {
      this.startWave(nextIndex);
    } else {
      this.waveState = WaveState.ALL_COMPLETE;
    }
  }

  private getWordForType(type: string): string {
    let filteredWords: string[];
    switch (type) {
      case 'tank':
        filteredWords = this.words.filter(w => w.length >= 6);
        break;
      case 'speed':
        filteredWords = this.words.filter(w => w.length <= 5);
        break;
      default:
        filteredWords = this.words;
        break;
    }
    if (filteredWords.length === 0) filteredWords = this.words;
    return filteredWords[Math.floor(Math.random() * filteredWords.length)];
  }

  checkCollisions(player: { position: { x: number; y: number }; radius: number }): boolean {
    for (const enemy of this.enemies) {
      if (enemy.checkCollision(player)) {
        return true;
      }
    }
    return false;
  }

  renderWaveUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    // Always show current wave indicator (top-right)
    ctx.font = '20px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Wave ${this.currentWave} / ${this.totalWaves}`,
      canvasWidth - 20,
      40
    );

    // Wave transition announcement
    if (this.waveState === WaveState.TRANSITIONING) {
      const alpha = 1 - this.waveAnnouncementProgress * 0.7;

      ctx.font = '48px monospace';
      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Wave ${this.currentWave}`, canvasWidth / 2, canvasHeight / 2 - 80);

      ctx.font = '20px monospace';
      ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
      ctx.fillText('Get ready!', canvasWidth / 2, canvasHeight / 2 - 40);
    }

    // Victory screen
    if (this.waveState === WaveState.ALL_COMPLETE) {
      ctx.font = '48px monospace';
      ctx.fillStyle = 'rgba(50, 255, 50, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOU WIN!', canvasWidth / 2, canvasHeight / 2 - 80);

      ctx.font = '24px monospace';
      ctx.fillStyle = 'rgba(200, 200, 200, 0.9)';
      ctx.fillText('All waves cleared!', canvasWidth / 2, canvasHeight / 2 - 40);
    }
  }
}
