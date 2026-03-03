import { Enemy, EnemyType, Position } from '../types';
import { EnemyFactory } from './EnemyFactory';
import { SpawnerNail } from '../entities/SpawnerNail';
import { TankNail } from '../entities/TankNail';
import { Sniper } from '../entities/Sniper';
import { SNIPER_WORDS } from '../data/sniperWords';
import { FONT_DEFAULT } from './FontLoader';

// ── Survival-mode configuration ──────────────────────────────────────

interface SurvivalSpawnConfig {
  type: EnemyType;
  unlockTime: number;    // seconds before this type starts spawning
  baseInterval: number;  // starting spawn interval in ms
  minInterval: number;   // fastest possible spawn interval in ms
}

const SURVIVAL_CONFIG: SurvivalSpawnConfig[] = [
  { type: 'nail',    unlockTime: 5,   baseInterval: 2500, minInterval: 600 },
  { type: 'zigzag',  unlockTime: 30,  baseInterval: 4000, minInterval: 1200 },
  { type: 'speed',   unlockTime: 60,  baseInterval: 3500, minInterval: 1000 },
  { type: 'tank',    unlockTime: 75,  baseInterval: 5000, minInterval: 1800 },
  { type: 'spawner', unlockTime: 90,  baseInterval: 8000, minInterval: 3000 },
  { type: 'sniper',  unlockTime: 100, baseInterval: 8000, minInterval: 3000 },
];

const GRACE_PERIOD = 5;            // seconds before first enemy spawns
const SPEED_RAMP_DURATION = 180;   // seconds to reach ~2x speed
const DIFFICULTY_RAMP_DURATION = 180; // seconds over which intervals shrink to minimum

// ── Spawn timer per enemy type ───────────────────────────────────────

interface SpawnTimer {
  config: SurvivalSpawnConfig;
  timer: number; // ms accumulated since last spawn
}

// ── EnemyManager ─────────────────────────────────────────────────────

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
  private elapsedTime: number = 0;          // seconds since game start
  private graceProgress: number = 0;        // 0 → 1 during grace period
  private spawnTimers: SpawnTimer[] = [];

  constructor(words: string[]) {
    this.words = words;
    this.initSpawnTimers();
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

  /** Elapsed game time in seconds */
  get survivalTime(): number {
    return this.elapsedTime;
  }

  /** A value that grows with difficulty, useful for visual effects (starts at 1) */
  get difficultyLevel(): number {
    return 1 + this.elapsedTime / 60;
  }

  /** Current global speed multiplier applied to enemy speeds */
  get speedMultiplier(): number {
    const t = Math.min(this.elapsedTime / SPEED_RAMP_DURATION, 1);
    return 1 + t; // ramps from 1.0 → 2.0
  }

  get isInGracePeriod(): boolean {
    return this.elapsedTime < GRACE_PERIOD;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  // ── Init / Reset ─────────────────────────────────────────────────

  private initSpawnTimers(): void {
    this.spawnTimers = SURVIVAL_CONFIG.map(config => ({
      config,
      timer: 0,
    }));
  }

  reset(): void {
    this.enemies = [];
    this.elapsedTime = 0;
    this.graceProgress = 0;
    this.initSpawnTimers();
  }

  clearEnemies(): void {
    this.enemies = [];
  }

  // ── Debug helpers ────────────────────────────────────────────────

  spawnAtPosition(type: EnemyType, spawnPos: Position, targetPos: Position): void {
    const usedLetters = this.getUsedFirstLetters();
    const word = this.getWordForType(type, usedLetters);
    if (!word) return; // no unique first letter available – skip
    const wordsForType = type === 'sniper' ? SNIPER_WORDS : this.words;
    const enemy = EnemyFactory.createAtPosition(type, word, spawnPos, targetPos, wordsForType, this.speedMultiplier);
    this.enemies.push(enemy);
  }

  // ── Main update loop ─────────────────────────────────────────────

  update(
    deltaTime: number,
    canvas: HTMLCanvasElement,
    targetX: number,
    targetY: number
  ): void {
    // In debug mode, only update existing enemies (no spawning)
    if (this._debugMode) {
      this.updateEnemies(deltaTime, canvas, targetX, targetY);
      return;
    }

    this.elapsedTime += deltaTime;

    // Grace period – don't spawn yet
    if (this.isInGracePeriod) {
      this.graceProgress = Math.min(1, this.elapsedTime / GRACE_PERIOD);
      this.updateEnemies(deltaTime, canvas, targetX, targetY);
      return;
    }

    // Continuous spawning
    const speedMult = this.speedMultiplier;
    const usedLetters = this.getUsedFirstLetters();

    for (const st of this.spawnTimers) {
      // Skip types not yet unlocked
      if (this.elapsedTime < st.config.unlockTime) continue;

      // Compute current interval (shrinks over time)
      const timeSinceUnlock = this.elapsedTime - st.config.unlockTime;
      const rampT = Math.min(timeSinceUnlock / DIFFICULTY_RAMP_DURATION, 1);
      const currentInterval =
        st.config.baseInterval + (st.config.minInterval - st.config.baseInterval) * rampT;

      st.timer += deltaTime * 1000;

      if (st.timer >= currentInterval) {
        const word = this.getWordForType(st.config.type, usedLetters);
        if (!word) continue; // no unique first letter – keep timer, retry next tick

        const wordsForType = st.config.type === 'sniper' ? SNIPER_WORDS : this.words;
        const enemy = EnemyFactory.create(
          st.config.type,
          word,
          canvas,
          targetX,
          targetY,
          wordsForType,
          speedMult
        );
        this.enemies.push(enemy);
        usedLetters.add(word[0]); // mark this letter as taken for subsequent spawns this tick
        st.timer = 0;
      }
    }

    this.updateEnemies(deltaTime, canvas, targetX, targetY);
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

      if (enemy instanceof SpawnerNail && enemy.pendingSpawns.length > 0) {
        this.onSpawnerSpawn?.();
        for (const child of enemy.pendingSpawns) {
          this.addChildWithUniqueLetter(child, this.words, usedLetters);
        }
        enemy.pendingSpawns = [];
      }

      if (enemy instanceof Sniper && enemy.pendingSpawns.length > 0) {
        this.onSniperShoot?.();
        for (const child of enemy.pendingSpawns) {
          this.addChildWithUniqueLetter(child, SNIPER_WORDS, usedLetters);
        }
        enemy.pendingSpawns = [];
      }

      if (enemy instanceof TankNail) {
        if (enemy.justStartedSpin) {
          this.onTankSpin?.();
          enemy.justStartedSpin = false;
        }
        if (enemy.justStartedDash) {
          this.onTankDash?.();
          enemy.justStartedDash = false;
        }
      }
    }

    this.enemies = this.enemies.filter(
      enemy => !enemy.isDestroyed && !enemy.isOffScreen(canvas)
    );
  }

  // ── Unique first-letter helpers ─────────────────────────────────

  /** Returns the set of first letters used by all active (targetable) enemies */
  private getUsedFirstLetters(): Set<string> {
    const used = new Set<string>();
    for (const e of this.enemies) {
      if (!e.isDestroyed && !e.wordCompleted && e.word.length > 0) {
        used.add(e.word[0]);
      }
    }
    return used;
  }

  /**
   * Attempt to add a child enemy (from SpawnerNail / Sniper) ensuring its
   * first letter is unique. If the child's current word conflicts, try to
   * reassign it from the given word pool. If no free letter exists, discard.
   */
  private addChildWithUniqueLetter(
    child: Enemy,
    wordPool: string[],
    usedLetters: Set<string>
  ): void {
    if (!usedLetters.has(child.word[0])) {
      // First letter is free – add as-is
      this.enemies.push(child);
      usedLetters.add(child.word[0]);
      return;
    }

    // Try to reassign to a word with a free first letter
    const available = wordPool.filter(w => !usedLetters.has(w[0]));
    if (available.length === 0) return; // no free letter – discard child

    const newWord = available[Math.floor(Math.random() * available.length)];
    child.word = newWord;
    child.typed = '';
    this.enemies.push(child);
    usedLetters.add(newWord[0]);
  }

  // ── Word selection ───────────────────────────────────────────────

  /**
   * Pick a random word for the given enemy type whose first letter is NOT
   * already used by an active on-screen enemy. Returns `null` when every
   * available first letter is already taken.
   */
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

    // Keep only words whose first letter isn't already on screen
    const available = filteredWords.filter(w => !usedLetters.has(w[0]));
    if (available.length === 0) return null;

    return available[Math.floor(Math.random() * available.length)];
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

  /** Format seconds as M:SS */
  static formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  renderSurvivalUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    // Always show elapsed time (top-right)
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

    // Grace period announcement with smooth fade-out
    const FADE_OUT_DURATION = 1.5; // seconds to fade out after grace period
    const fadeEnd = GRACE_PERIOD + FADE_OUT_DURATION;

    if (this.elapsedTime < fadeEnd) {
      let alpha: number;
      if (this.elapsedTime < GRACE_PERIOD) {
        // During grace period: gently dim from 1.0 → 0.6
        alpha = 1 - this.graceProgress * 0.4;
      } else {
        // After grace period: smoothly fade from 0.6 → 0
        const fadeProgress = (this.elapsedTime - GRACE_PERIOD) / FADE_OUT_DURATION;
        alpha = 0.6 * (1 - fadeProgress);
      }

      // Also drift the text upward during fade-out for a polished feel
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
