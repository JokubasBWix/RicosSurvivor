import { Enemy, EnemyType, Position } from '../types';
import { EnemyFactory } from './EnemyFactory';
import { SpeedNail } from '../entities/SpeedNail';
import { TankNail } from '../entities/TankNail';
import { ZigzagNail } from '../entities/ZigzagNail';
import { StalkerNail } from '../entities/StalkerNail';
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
  { type: 'nail',    unlockTime: 1,   baseInterval: 4500, minInterval: 4000 },
  { type: 'zigzag',  unlockTime: 10,  baseInterval: 5000, minInterval: 4000 },
  { type: 'speed',   unlockTime: 15,  baseInterval: 6500, minInterval: 4000 },
  { type: 'tank',    unlockTime: 20,  baseInterval: 8000, minInterval: 4000 },
  { type: 'stalker', unlockTime: 25,  baseInterval: 9000, minInterval: 4000 },
  { type: 'sniper',  unlockTime: 35, baseInterval: 6000, minInterval: 4000 },
];

const GRACE_PERIOD = 1;            // seconds before first enemy spawns
const SPEED_RAMP_DURATION = 180;   // seconds to reach ~2x speed
const DIFFICULTY_RAMP_DURATION = 180; // seconds over which intervals shrink to minimum

// ── Spawn timer per enemy type ───────────────────────────────────────

interface SpawnTimer {
  config: SurvivalSpawnConfig;
  timer: number; // ms accumulated since last spawn
}

interface PendingSpawn {
  enemy: Enemy;
  delay: number; // seconds remaining before activation
}

const SPEED_BURST_COUNT = 3;
const SPEED_BURST_DELAY = 0.15; // seconds between each in the burst

// ── EnemyManager ─────────────────────────────────────────────────────

export class EnemyManager {
  private enemies: Enemy[] = [];
  private words: string[];
  private _debugMode: boolean = false;

  // Sound callbacks (wired by Game.ts)
  public onSniperShoot?: () => void;
  public onSpawnerSpawn?: () => void;
  public onTankSpin?: () => (() => void) | null;
  public onZigzagSpawn?: () => (() => void) | null;
  public onStalkerSpawn?: () => (() => void) | null;
  public onSpeedSpawn?: () => (() => void) | null;

  // Loop sound stop handles keyed by enemy instance
  private loopStops = new Map<Enemy, () => void>();

  // Survival state
  private elapsedTime: number = 0;          // seconds since game start
  private graceProgress: number = 0;        // 0 → 1 during grace period
  private spawnTimers: SpawnTimer[] = [];
  private pendingSpawns: PendingSpawn[] = [];

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
    this.stopAllLoops();
    this.enemies = [];
    this.pendingSpawns = [];
    this.elapsedTime = 0;
    this.graceProgress = 0;
    this.initSpawnTimers();
  }

  clearEnemies(): void {
    this.stopAllLoops();
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
    this.startLoopSound(enemy);
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

    for (const ps of this.pendingSpawns) {
      usedLetters.add(ps.enemy.word[0]);
    }

    for (const st of this.spawnTimers) {
      if (this.elapsedTime < st.config.unlockTime) continue;

      const timeSinceUnlock = this.elapsedTime - st.config.unlockTime;
      const rampT = Math.min(timeSinceUnlock / DIFFICULTY_RAMP_DURATION, 1);
      const currentInterval =
        st.config.baseInterval + (st.config.minInterval - st.config.baseInterval) * rampT;

      st.timer += deltaTime * 1000;

      if (st.timer >= currentInterval) {
        if (st.config.type === 'speed') {
          this.enqueueSpeedBurst(canvas, targetX, targetY, speedMult, usedLetters);
          st.timer = 0;
          continue;
        }

        const word = this.getWordForType(st.config.type, usedLetters);
        if (!word) continue;

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
        this.startLoopSound(enemy);
        usedLetters.add(word[0]);
        st.timer = 0;
      }
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
    const cornerIndex = Math.floor(Math.random() * 4);

    let firstEnemy: Enemy | null = null;
    for (let i = 0; i < SPEED_BURST_COUNT; i++) {
      const word = this.getWordForType('speed', usedLetters);
      if (!word) break;

      const enemy = SpeedNail.spawnFromCorner(word, canvas, targetX, targetY, min, max, cornerIndex);
      usedLetters.add(word[0]);

      if (i === 0) {
        firstEnemy = enemy;
        this.enemies.push(enemy);
      } else {
        this.pendingSpawns.push({ enemy, delay: SPEED_BURST_DELAY * i });
      }
    }

    // Start one shared loop for the entire burst, keyed to the first enemy
    if (firstEnemy) {
      const stop = this.onSpeedSpawn?.();
      if (stop) this.loopStops.set(firstEnemy, stop);
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
        enemy.pendingEvents = [];
      }
    }

    // Stop loop sounds for enemies about to be removed
    for (const enemy of this.enemies) {
      if (enemy.isDestroyed || enemy.isOffScreen(canvas)) {
        const stop = this.loopStops.get(enemy);
        if (stop) { stop(); this.loopStops.delete(enemy); }
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
   * Attempt to add a child enemy (from Sniper) ensuring its
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

  // ── Loop sound helpers ─────────────────────────────────────────────

  private startLoopSound(enemy: Enemy): void {
    let stop: (() => void) | null | undefined;
    if (enemy instanceof ZigzagNail) {
      stop = this.onZigzagSpawn?.();
    } else if (enemy instanceof StalkerNail) {
      stop = this.onStalkerSpawn?.();
    } else if (enemy instanceof TankNail) {
      stop = this.onTankSpin?.();
    }
    if (stop) this.loopStops.set(enemy, stop);
  }

  public stopAllLoops(): void {
    for (const stop of this.loopStops.values()) stop();
    this.loopStops.clear();
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
