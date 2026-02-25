import { Enemy, EnemyType, Position, WaveConfig, WaveEnemyConfig } from '../types';
import { EnemyFactory } from './EnemyFactory';
import { SpawnerNail } from '../entities/SpawnerNail';
import { Sniper } from '../entities/Sniper';
import { SNIPER_WORDS } from '../data/sniperWords';
import { FONT_DEFAULT } from './FontLoader';
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
    const wordsForType = type === 'sniper' ? SNIPER_WORDS : this.words;
    const enemy = EnemyFactory.createAtPosition(type, word, spawnPos, targetPos, wordsForType);
    this.enemies.push(enemy);
  }

  clearEnemies(): void {
    this.enemies = [];
  }

  reset(): void {
    this.enemies = [];
    this.startWave(0);
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
          const wordsForType = tracker.config.type === 'sniper' ? SNIPER_WORDS : this.words;
          const enemy = EnemyFactory.create(
            tracker.config.type,
            word,
            canvas,
            targetX,
            targetY,
            wordsForType
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

      if (enemy instanceof Sniper && enemy.pendingSpawns.length > 0) {
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
      case 'sniper':
        return SNIPER_WORDS[Math.floor(Math.random() * SNIPER_WORDS.length)];
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
    ctx.font = `20px "${FONT_DEFAULT}", monospace`;
    ctx.fillStyle = 'rgba(58, 58, 58, 0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Wave ${this.currentWave} / ${this.totalWaves}`,
      canvasWidth - 20,
      40
    );

    if (this.waveState === WaveState.TRANSITIONING) {
      const alpha = 1 - this.waveAnnouncementProgress * 0.7;

      ctx.font = `48px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = `rgba(180, 120, 0, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Wave ${this.currentWave}`, canvasWidth / 2, canvasHeight / 2 - 180);

      ctx.font = `20px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = `rgba(80, 80, 80, ${alpha})`;
      ctx.fillText('Get ready!', canvasWidth / 2, canvasHeight / 2 - 140);
    }

    if (this.waveState === WaveState.ALL_COMPLETE) {
      ctx.font = `48px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = 'rgba(20, 160, 20, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOU WIN!', canvasWidth / 2, canvasHeight / 2 - 180);

      ctx.font = `24px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = 'rgba(80, 80, 80, 0.9)';
      ctx.fillText('All waves cleared!', canvasWidth / 2, canvasHeight / 2 - 140);
    }
  }
}
