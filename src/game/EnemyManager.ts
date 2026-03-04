import { Enemy, EnemyType, Position } from '../types';
import { EnemyFactory } from './EnemyFactory';
import { SpeedNail } from '../entities/SpeedNail';
import { TankNail } from '../entities/TankNail';
import { Sniper } from '../entities/Sniper';
import { SNIPER_WORDS } from '../data/sniperWords';
import { FONT_DEFAULT } from './FontLoader';
import { SeededRNG } from '../utils/SeededRNG';

// ── Survival-mode spawn type configuration ──────────────────────────

interface SpawnTypeConfig {
  type: EnemyType;
  unlockTime: number;        // seconds before this type enters the pool
  startWeight: number;       // weight at unlock
  maxWeight: number;         // weight after ramp completes
  weightRampDuration: number; // seconds from unlock to reach maxWeight
}

const SPAWN_TYPES: SpawnTypeConfig[] = [
  { type: 'nail',    unlockTime: 1,   startWeight: 40, maxWeight: 20,  weightRampDuration: 90 },
  { type: 'zigzag',  unlockTime: 10,  startWeight: 18,  maxWeight: 25,  weightRampDuration: 90  },
  { type: 'speed',   unlockTime: 15,  startWeight: 8,  maxWeight: 15,  weightRampDuration: 90  },
  { type: 'tank',    unlockTime: 20,  startWeight: 5,  maxWeight: 20,  weightRampDuration: 90  },
  { type: 'stalker', unlockTime: 25,  startWeight: 10,  maxWeight: 25,  weightRampDuration: 90  },
  { type: 'sniper',  unlockTime: 35,  startWeight: 3,  maxWeight: 14,  weightRampDuration: 90 },
];

const GRACE_PERIOD = 1;
const BASE_SPAWN_INTERVAL = 2200;        // ms between spawns at start
const MIN_SPAWN_INTERVAL = 1200;         // ms between spawns at max difficulty
const DIFFICULTY_RAMP_DURATION = 180;    // seconds over which interval shrinks
const SPEED_RAMP_DURATION = 180;         // seconds to reach ~2× speed

const MIN_ACTIVE_ENEMIES_START = 2;
const MIN_ACTIVE_ENEMIES_END = 5;

const SPEED_BURST_COUNT = 3;
const SPEED_BURST_DELAY = 0.6;

// ── Pending spawn (for staggered bursts) ────────────────────────────

interface PendingSpawn {
  enemy: Enemy;
  delay: number;
}

// ── EnemyManager ────────────────────────────────────────────────────

export class EnemyManager {
  private enemies: Enemy[] = [];
  private words: string[];
  private _debugMode: boolean = false;

  // Sound callbacks (wired by Game.ts)
  public onSniperShoot?: () => void;
  public onSpawnerSpawn?: () => void;
  public onTankDash?: () => void;
  public onTankSpin?: () => void;

  // Survival state
  private elapsedTime: number = 0;
  private graceProgress: number = 0;
  private spawnTimer: number = 0;
  private pendingSpawns: PendingSpawn[] = [];

  // Deterministic RNG
  private rng: SeededRNG;
  private seed: number;

  constructor(words: string[], seed: number = 12345) {
    this.words = words;
    this.seed = seed;
    this.rng = new SeededRNG(seed);
  }

  // ── Getters ──────────────────────────────────────────────────────

  get debugMode(): boolean {
    return this._debugMode;
  }

  set debugMode(value: boolean) {
    this._debugMode = value;
    if (value) {
      this.enemies = [];
    }
  }

  get survivalTime(): number {
    return this.elapsedTime;
  }

  get difficultyLevel(): number {
    return 1 + this.elapsedTime / 60;
  }

  get speedMultiplier(): number {
    const t = Math.min(this.elapsedTime / SPEED_RAMP_DURATION, 1);
    return 1 + t;
  }

  get isInGracePeriod(): boolean {
    return this.elapsedTime < GRACE_PERIOD;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  // ── Init / Reset ─────────────────────────────────────────────────

  reset(): void {
    this.enemies = [];
    this.pendingSpawns = [];
    this.elapsedTime = 0;
    this.graceProgress = 0;
    this.spawnTimer = 0;
    this.rng = new SeededRNG(this.seed);
  }

  clearEnemies(): void {
    this.enemies = [];
  }

  // ── Debug helpers ────────────────────────────────────────────────

  spawnAtPosition(type: EnemyType, spawnPos: Position, targetPos: Position): void {
    const usedLetters = this.getUsedFirstLetters();
    const word = this.getWordForType(type, usedLetters);
    if (!word) return;
    const wordsForType = type === 'sniper' ? SNIPER_WORDS : this.words;
    const enemy = EnemyFactory.createAtPosition(type, word, spawnPos, targetPos, wordsForType, this.speedMultiplier);
    this.enemies.push(enemy);
  }

  // ── Spawn interval (ramps down over time) ────────────────────────

  private getCurrentSpawnInterval(): number {
    const rampT = Math.min(this.elapsedTime / DIFFICULTY_RAMP_DURATION, 1);
    return BASE_SPAWN_INTERVAL + (MIN_SPAWN_INTERVAL - BASE_SPAWN_INTERVAL) * rampT;
  }

  // ── Weighted type selection ──────────────────────────────────────

  private getWeight(st: SpawnTypeConfig): number {
    const timeSinceUnlock = this.elapsedTime - st.unlockTime;
    if (timeSinceUnlock <= 0) return 0;
    const t = Math.min(timeSinceUnlock / st.weightRampDuration, 1);
    return st.startWeight + (st.maxWeight - st.startWeight) * t;
  }

  private pickEnemyType(): EnemyType {
    const available = SPAWN_TYPES.filter(st => this.elapsedTime >= st.unlockTime);
    const weights = available.map(st => this.getWeight(st));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = this.rng.next() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return available[i].type;
    }
    return available[available.length - 1].type;
  }

  // ── Main update loop ─────────────────────────────────────────────

  update(
    deltaTime: number,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number
  ): void {
    if (this._debugMode) {
      this.updateEnemies(deltaTime, canvas, targetX, targetY);
      return;
    }

    this.elapsedTime += deltaTime;

    if (this.isInGracePeriod) {
      this.graceProgress = Math.min(1, this.elapsedTime / GRACE_PERIOD);
      this.updateEnemies(deltaTime, canvas, targetX, targetY);
      return;
    }

    const speedMult = this.speedMultiplier;
    const usedLetters = this.getUsedFirstLetters();
    for (const ps of this.pendingSpawns) {
      usedLetters.add(ps.enemy.word[0]);
    }

    const currentInterval = this.getCurrentSpawnInterval();
    const rampT = Math.min(this.elapsedTime / DIFFICULTY_RAMP_DURATION, 1);
    const minActive = Math.round(MIN_ACTIVE_ENEMIES_START + (MIN_ACTIVE_ENEMIES_END - MIN_ACTIVE_ENEMIES_START) * rampT);
    const activeCount = this.enemies.length + this.pendingSpawns.length;

    if (activeCount < minActive) {
      this.spawnTimer = currentInterval;
    } else {
      this.spawnTimer += deltaTime * 1000;
    }

    while (this.spawnTimer >= currentInterval) {
      this.spawnTimer -= currentInterval;

      const type = this.pickEnemyType();

      if (type === 'speed') {
        this.enqueueSpeedBurst(canvas, targetX, targetY, speedMult, usedLetters);
        continue;
      }

      const word = this.getWordForType(type, usedLetters);
      if (!word) continue;

      const wordsForType = type === 'sniper' ? SNIPER_WORDS : this.words;
      const enemy = EnemyFactory.create(
        type, word, canvas, targetX, targetY, wordsForType, speedMult, this.rng
      );
      this.enemies.push(enemy);
      usedLetters.add(word[0]);
    }

    this.tickPendingSpawns(deltaTime);
    this.updateEnemies(deltaTime, canvas, targetX, targetY);
  }

  // ── Speed burst spawning ─────────────────────────────────────────

  private enqueueSpeedBurst(
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    speedMult: number,
    usedLetters: Set<string>
  ): void {
    const { min, max } = EnemyFactory.getSpeedRange('speed', speedMult);
    const cornerIndex = this.rng.nextInt(0, 4);

    for (let i = 0; i < SPEED_BURST_COUNT; i++) {
      const word = this.getWordForType('speed', usedLetters);
      if (!word) break;

      const enemy = SpeedNail.spawnFromCorner(
        word, canvas, targetX, targetY, min, max, cornerIndex, this.rng
      );
      usedLetters.add(word[0]);

      if (i === 0) {
        this.enemies.push(enemy);
      } else {
        this.pendingSpawns.push({ enemy, delay: SPEED_BURST_DELAY * i });
      }
    }
  }

  private tickPendingSpawns(deltaTime: number): void {
    const ready: Enemy[] = [];
    this.pendingSpawns = this.pendingSpawns.filter(ps => {
      ps.delay -= deltaTime;
      if (ps.delay <= 0) {
        ready.push(ps.enemy);
        return false;
      }
      return true;
    });
    for (const enemy of ready) {
      this.enemies.push(enemy);
    }
  }

  // ── Enemy bookkeeping ────────────────────────────────────────────

  private updateEnemies(
    deltaTime: number,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number
  ): void {
    const usedLetters = this.getUsedFirstLetters();

    for (const enemy of this.enemies) {
      enemy.update(deltaTime, { x: targetX, y: targetY });

      if (enemy instanceof Sniper && enemy.pendingSpawns.length > 0) {
        this.onSniperShoot?.();
        for (const child of enemy.pendingSpawns) {
          this.addChildWithUniqueLetter(child, SNIPER_WORDS, usedLetters);
        }
        enemy.pendingSpawns = [];
      }

      if (enemy instanceof TankNail && enemy.pendingEvents.length > 0) {
        for (const ev of enemy.pendingEvents) {
          if (ev === 'spin') this.onTankSpin?.();
          else if (ev === 'dash') this.onTankDash?.();
        }
        enemy.pendingEvents = [];
      }
    }

    this.enemies = this.enemies.filter(
      enemy => !enemy.isDestroyed && !enemy.isOffScreen(canvas)
    );
  }

  // ── Unique first-letter helpers ─────────────────────────────────

  private getUsedFirstLetters(): Set<string> {
    const used = new Set<string>();
    for (const e of this.enemies) {
      if (!e.isDestroyed && !e.wordCompleted && e.word.length > 0) {
        used.add(e.word[0]);
      }
    }
    return used;
  }

  private addChildWithUniqueLetter(
    child: Enemy,
    wordPool: string[],
    usedLetters: Set<string>
  ): void {
    if (!usedLetters.has(child.word[0])) {
      this.enemies.push(child);
      usedLetters.add(child.word[0]);
      return;
    }

    const available = wordPool.filter(w => !usedLetters.has(w[0]));
    if (available.length === 0) return;

    const newWord = available[this.rng.nextInt(0, available.length)];
    child.word = newWord;
    child.typed = '';
    this.enemies.push(child);
    usedLetters.add(newWord[0]);
  }

  // ── Word selection ───────────────────────────────────────────────

  private getWordForType(type: string, usedLetters: Set<string>): string | null {
    let filteredWords: string[];
    switch (type) {
      case 'tank':
        filteredWords = this.words.filter(w => w.length >= 6);
        break;
      case 'speed':
        filteredWords = this.words.filter(w => w.length <= 5);
        break;
      case 'sniper':
        filteredWords = [...SNIPER_WORDS];
        break;
      default:
        filteredWords = this.words;
        break;
    }
    if (filteredWords.length === 0) filteredWords = this.words;

    const available = filteredWords.filter(w => !usedLetters.has(w[0]));
    if (available.length === 0) return null;

    return available[this.rng.nextInt(0, available.length)];
  }

  // ── Collisions ───────────────────────────────────────────────────

  checkCollisions(player: { position: { x: number; y: number }; radius: number }): boolean {
    for (const enemy of this.enemies) {
      if (enemy.checkCollision(player)) {
        return true;
      }
    }
    return false;
  }

  // ── HUD rendering ────────────────────────────────────────────────

  static formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  renderSurvivalUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    ctx.font = `bold 42px "${FONT_DEFAULT}", monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(
      EnemyManager.formatTime(this.elapsedTime),
      canvasWidth - 20,
      20
    );
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      EnemyManager.formatTime(this.elapsedTime),
      canvasWidth - 20,
      20
    );

    const FADE_OUT_DURATION = 1.5;
    const fadeEnd = GRACE_PERIOD + FADE_OUT_DURATION;

    if (this.elapsedTime < fadeEnd) {
      let alpha: number;
      if (this.elapsedTime < GRACE_PERIOD) {
        alpha = 1 - this.graceProgress * 0.4;
      } else {
        const fadeProgress = (this.elapsedTime - GRACE_PERIOD) / FADE_OUT_DURATION;
        alpha = 0.6 * (1 - fadeProgress);
      }

      const baseY = canvasHeight / 2 - 180;
      const drift = this.elapsedTime >= GRACE_PERIOD
        ? ((this.elapsedTime - GRACE_PERIOD) / FADE_OUT_DURATION) * 30
        : 0;

      ctx.font = `48px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = `rgba(180, 120, 0, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Get Ready!', canvasWidth / 2, baseY - drift);

      ctx.font = `20px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = `rgba(80, 80, 80, ${alpha})`;
      ctx.fillText('Survive as long as you can', canvasWidth / 2, baseY + 40 - drift);
    }
  }
}
