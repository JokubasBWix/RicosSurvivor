import { TreeStump } from '../entities/TreeStump';
import { LeafProjectile } from '../entities/LeafProjectile';
import { Nail } from '../entities/Nail';
import { ZigzagNail } from '../entities/ZigzagNail';
import { SpawnerNail } from '../entities/SpawnerNail';
import { TankNail } from '../entities/TankNail';
import { SpeedNail } from '../entities/SpeedNail';
import { Sniper } from '../entities/Sniper';
import { Enemy, EnemyType, GameState } from '../types';
import { InputManager } from './InputManager';
import { EnemyManager } from './EnemyManager';
import { Leaderboard } from './Leaderboard';
import { SunburstBackground } from './SunburstBackground';
import { TargetLockRenderer } from './TargetLockRenderer';
import { FONT_DEFAULT } from './FontLoader';
import { ScreenShake } from './ScreenShake';
import { ShatterEffect } from './ShatterEffect';
import { ImpactEffect } from './ImpactEffect';
import { BigExplosionEffect } from './BigExplosionEffect';
import { ScoreProgressBar } from './ScoreProgressBar';
import { SoundManager } from './SoundManager';
import stumpDeadSrc from '../assets/images/stumpy/stump_dead.png';
import stumpNeutralSrc from '../assets/images/stumpy/stump_neutral.png';

const ENEMY_TYPES: EnemyType[] = ['nail', 'zigzag', 'spawner', 'tank', 'speed', 'sniper'];

const ENEMY_TYPE_COLORS: Record<EnemyType, string> = {
  nail:    '#ff9966',
  zigzag:  '#6688ff',
  spawner: '#ff66ff',
  tank:    '#ff6666',
  speed:   '#66ff66',
  sniper:  '#ff4444'
};

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private treeStump: TreeStump;
  private enemyManager: EnemyManager;
  private inputManager: InputManager;
  private sunburst: SunburstBackground;
  private targetLock: TargetLockRenderer;
  private leafProjectiles: LeafProjectile[] = [];
  private knockbacks: Map<Enemy, { vx: number; vy: number }> = new Map();
  private shatterEffects: ShatterEffect[] = [];
  private bigExplosionEffects: BigExplosionEffect[] = [];
  private impactEffects: ImpactEffect[] = [];
  private gameState: GameState = GameState.START_SCREEN;
  private score: number = 0;
  private lastTime: number = 0;
  private playerName: string = '';

  // Leaderboard
  private leaderboard: Leaderboard;

  // Start screen DOM refs
  private startOverlay: HTMLDivElement;
  private startNameInput: HTMLInputElement;
  private startLeaderboardList: HTMLOListElement;
  private startLeaderboardEmpty: HTMLElement;
  private startStumpy: HTMLImageElement;

  // Game-over overlay DOM refs
  private overlay: HTMLDivElement;
  private overlayScore: HTMLElement;
  private overlayWave: HTMLElement;
  private leaderboardList: HTMLOListElement;
  private leaderboardEmpty: HTMLElement;

  // Screen shake
  private screenShake: ScreenShake = new ScreenShake();

  // Score progress bar
  private scoreProgressBar: ScoreProgressBar = new ScoreProgressBar();

  // Sound
  private sound: SoundManager = new SoundManager();

  // Death animation
  private deathTimer: number = 0;
  private deathFreezeTimer: number = 0;
  private deathFlashAlpha: number = 0;
  private deathFadeAlpha: number = 0;
  private deathShatterEffects: ShatterEffect[] = [];

  // HUD entrance animation (0 → 1 over ~0.8s on game start)
  private hudEntranceProgress: number = 1;
  private static readonly HUD_ENTRANCE_DURATION = 0.8;

  // Debug mode
  private debugSelectedType: EnemyType = 'nail';
  private debugMessage: string = '';
  private debugMessageTimer: number = 0;

  // Sound test panel
  private soundPanel: HTMLDivElement;

  // Cleanup
  private abortController = new AbortController();

  constructor(canvas: HTMLCanvasElement, inputElement: HTMLInputElement, words: string[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.treeStump = new TreeStump(canvas);
    this.enemyManager = new EnemyManager(words);
    this.enemyManager.onSniperShoot = () => this.sound.playSniperShoot();
    this.enemyManager.onSpawnerSpawn = () => this.sound.playSpawnerSpawn();
    this.enemyManager.onTankDash = () => this.sound.playTankDash();
    this.enemyManager.onTankSpin = () => this.sound.playTankSpin();
    this.sunburst = new SunburstBackground();
    this.targetLock = new TargetLockRenderer();
    this.inputManager = new InputManager(
      inputElement,
      () => {},
      (enemy) => {
        this.sound.playCorrectLetter();
        this.treeStump.triggerAttack();
        this.leafProjectiles.push(
          new LeafProjectile({ ...this.treeStump.position }, enemy)
        );
        enemy.typedScale = 1.35;
        this.screenShake.trigger(1.5);
      },
      () => { this.sound.playWrongLetter(); }
    );

    this.leaderboard = new Leaderboard();

    // Grab start screen DOM elements
    this.startOverlay = document.getElementById('start-screen-overlay') as HTMLDivElement;
    this.startNameInput = document.getElementById('start-player-name') as HTMLInputElement;
    this.startLeaderboardList = document.getElementById('start-leaderboard-list') as HTMLOListElement;
    this.startLeaderboardEmpty = document.getElementById('start-leaderboard-empty')!;
    this.startStumpy = document.getElementById('start-stumpy') as HTMLImageElement;
    this.startStumpy.src = stumpNeutralSrc;

    // Grab game-over overlay DOM elements
    this.overlay = document.getElementById('game-over-overlay') as HTMLDivElement;
    this.overlayScore = document.getElementById('overlay-score')!;
    this.overlayWave = document.getElementById('overlay-wave')!;
    this.leaderboardList = document.getElementById('leaderboard-list') as HTMLOListElement;
    this.leaderboardEmpty = document.getElementById('leaderboard-empty')!;

    // Set dead stumpy image src (Vite-resolved asset)
    const deadStumpyImg = document.getElementById('dead-stumpy') as HTMLImageElement | null;
    if (deadStumpyImg) deadStumpyImg.src = stumpDeadSrc;

    this.soundPanel = this.buildSoundPanel();

    // Sync mute button with persisted state
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.textContent = this.sound.muted ? '🔇' : '🔊';
    }

    this.setupCanvas();
    this.setupEventListeners();
    this.setupStartScreenListeners();
  }

  private setupCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupStartScreenListeners(): void {
    this.startNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.startGame();
      }
    });
  }

  private setupEventListeners(): void {
    const opts = { signal: this.abortController.signal };

    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.treeStump.resize(this.canvas);
    }, opts);

    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
      }, opts);
    }

    window.addEventListener('keydown', (e) => {
      // Don't intercept when a visible input/textarea is focused (e.g. name input on game over)
      const active = document.activeElement;
      const isTypingInInput =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
        active.id !== 'input'; // the hidden game input

      // Escape to go to start screen when game over
      if (e.key === 'Escape' && this.gameState === GameState.GAME_OVER) {
        e.preventDefault();
        this.goToStartScreen();
        return;
      }

      if (isTypingInInput) return;

      // Toggle sound test panel with ~ (Shift+backtick)
      if (e.key === '~') {
        const visible = this.soundPanel.style.display !== 'none';
        this.soundPanel.style.display = visible ? 'none' : 'block';
        return;
      }

      // Toggle debug mode with backtick
      if (e.key === '`') {
        this.enemyManager.debugMode = !this.enemyManager.debugMode;
        if (this.enemyManager.debugMode) {
          this.gameState = GameState.PLAYING;
        }
        return;
      }

      if (!this.enemyManager.debugMode) return;

      // Keys 1-5 select enemy type
      const num = parseInt(e.key);
      if (num >= 1 && num <= ENEMY_TYPES.length) {
        this.debugSelectedType = ENEMY_TYPES[num - 1];
      }

      // C clears all enemies
      if (e.key === 'c' || e.key === 'C') {
        this.enemyManager.clearEnemies();
      }

      // L clears entire leaderboard
      if (e.key === 'l' || e.key === 'L') {
        this.leaderboard.clear().then(() => this.showDebugMessage('Leaderboard cleared'));
      }

      // R prompts to remove a leaderboard entry
      if (e.key === 'r' || e.key === 'R') {
        this.promptRemoveLeaderboardEntry();
      }
    }, opts);

    this.canvas.addEventListener('click', (e) => {
      if (this.gameState === GameState.GAME_OVER || this.gameState === GameState.START_SCREEN) return;

      if (!this.enemyManager.debugMode) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      this.enemyManager.spawnAtPosition(
        this.debugSelectedType,
        { x: clickX, y: clickY },
        this.treeStump.position
      );
    }, opts);
  }

  private showDebugMessage(msg: string): void {
    this.debugMessage = msg;
    this.debugMessageTimer = 2;
  }

  private async promptRemoveLeaderboardEntry(): Promise<void> {
    const entries = this.leaderboard.getEntries();
    if (entries.length === 0) {
      this.showDebugMessage('Leaderboard is empty');
      return;
    }

    const list = entries.map((e, i) => `${i + 1}. ${e.name} - ${e.score}`).join('\n');
    const input = prompt(`Remove which entry? (1-${entries.length})\n\n${list}`);
    if (input === null) return;

    const idx = parseInt(input) - 1;
    if (isNaN(idx) || idx < 0 || idx >= entries.length) {
      this.showDebugMessage('Invalid index');
      return;
    }

    const removed = entries[idx];
    await this.leaderboard.removeEntry(idx);
    this.showDebugMessage(`Removed: ${removed.name}`);
  }

  private buildSoundPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed', 'top:60px', 'left:12px',
      'background:rgba(0,0,0,0.88)', 'color:#ddd',
      'border-radius:8px', 'padding:12px 14px',
      'max-height:80vh', 'overflow-y:auto',
      'z-index:9999', 'font:13px/1.6 monospace',
      'display:none', 'min-width:300px',
      'border:1px solid rgba(255,200,50,0.4)',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Sound Test  (~)';
    title.style.cssText = 'font-weight:bold;font-size:15px;color:rgba(255,200,50,1);margin-bottom:8px';
    panel.appendChild(title);

    for (const entry of this.sound.getSoundCatalogue()) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0';

      const btn = document.createElement('button');
      btn.textContent = '\u25B6';
      btn.style.cssText = [
        'cursor:pointer', 'background:none', 'border:1px solid #666',
        'color:#fff', 'border-radius:4px', 'width:28px', 'height:24px',
        'font-size:12px', 'flex-shrink:0',
      ].join(';');
      btn.addEventListener('click', () => entry.play());

      if (entry.stop) {
        const stopBtn = document.createElement('button');
        stopBtn.textContent = '\u25A0';
        stopBtn.style.cssText = [
          'cursor:pointer', 'background:none', 'border:1px solid #666',
          'color:#fff', 'border-radius:4px', 'width:28px', 'height:24px',
          'font-size:12px', 'flex-shrink:0',
        ].join(';');
        stopBtn.addEventListener('click', () => entry.stop!());
        row.appendChild(stopBtn);
      }

      const name = document.createElement('span');
      name.textContent = entry.name;
      name.style.cssText = 'font-weight:bold;color:#fff;flex-shrink:0';

      const desc = document.createElement('span');
      desc.textContent = entry.description;
      desc.style.cssText = 'color:rgba(180,180,180,0.7)';

      row.appendChild(btn);
      row.appendChild(name);
      row.appendChild(desc);
      panel.appendChild(row);
    }

    document.body.appendChild(panel);
    return panel;
  }

  private async showGameOverOverlay(): Promise<void> {
    this.overlayScore.textContent = `Final Score: ${this.score}`;
    this.overlayWave.textContent = `Survived ${EnemyManager.formatTime(this.enemyManager.survivalTime)}`;

    // Auto-save score using the player name from the start screen
    if (this.playerName) {
      await this.leaderboard.addEntry(this.playerName, this.score, this.enemyManager.survivalTime);
    }

    this.renderLeaderboardList(this.leaderboardList, this.leaderboardEmpty, true);

    // Reset animation classes before showing
    const title = this.overlay.querySelector('.overlay-title') as HTMLElement;
    const belowTitle = this.overlay.querySelector('.overlay-below-title') as HTMLElement;
    const deadStumpy = this.overlay.querySelector('.dead-stumpy') as HTMLElement;
    title?.classList.remove('animate-drop');
    belowTitle?.classList.remove('animate-fade-in');
    deadStumpy?.classList.remove('animate-fall');
    this.overlay.classList.remove('visible');

    // Show the overlay (un-hide it)
    this.overlay.classList.remove('hidden');

    // Trigger animations on next frame so the browser registers the initial state
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      title?.classList.add('animate-drop');
      belowTitle?.classList.add('animate-fade-in');
      deadStumpy?.classList.add('animate-fall');
    });
  }

  private hideGameOverOverlay(): void {
    const title = this.overlay.querySelector('.overlay-title') as HTMLElement;
    const belowTitle = this.overlay.querySelector('.overlay-below-title') as HTMLElement;
    title?.classList.remove('animate-drop');
    belowTitle?.classList.remove('animate-fade-in');
    this.overlay.classList.remove('visible');
    this.overlay.classList.add('hidden');
  }

  private renderLeaderboardList(
    listEl: HTMLOListElement,
    emptyEl: HTMLElement,
    highlightPlayer: boolean = false
  ): void {
    const entries = this.leaderboard.getEntries();
    listEl.innerHTML = '';

    if (entries.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    let highlightedLi: HTMLLIElement | null = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const li = document.createElement('li');

      // Highlight the current player's entry
      if (
        highlightPlayer &&
        this.playerName &&
        entry.name.toLowerCase() === this.playerName.toLowerCase()
      ) {
        li.classList.add('highlight');
        if (!highlightedLi) highlightedLi = li;
      }

      const timeStr = entry.survivalTime != null
        ? EnemyManager.formatTime(entry.survivalTime)
        : '--:--';

      li.innerHTML = `
        <span class="rank">${i + 1}.</span>
        <span class="entry-name">${this.escapeHtml(entry.name)}</span>
        <span class="entry-time">${timeStr}</span>
        <span class="entry-score">${entry.score}</span>
      `;
      listEl.appendChild(li);
    }

    // Scroll to the highlighted entry
    if (highlightedLi) {
      requestAnimationFrame(() => {
        highlightedLi!.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else {
      // Reset scroll to the top when no highlight
      listEl.scrollTop = 0;
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private update(deltaTime: number): void {
    this.sunburst.update(deltaTime, this.enemyManager.difficultyLevel);

    // Death animation update
    if (this.gameState === GameState.DYING) {
      this.screenShake.update(deltaTime);

      // Hit-freeze: skip all updates while freeze timer is active
      if (this.deathFreezeTimer > 0) {
        this.deathFreezeTimer -= deltaTime;
        return;
      }

      this.deathTimer -= deltaTime;

      // Ramp the dark fade up to match the overlay bg (~0.55)
      this.deathFadeAlpha = Math.min(0.55, this.deathFadeAlpha + deltaTime * 1.0);

      // Update death shatter effects
      for (const effect of this.deathShatterEffects) {
        effect.update(deltaTime);
      }
      this.deathShatterEffects = this.deathShatterEffects.filter((e) => !e.isFinished);

      // Transition to GAME_OVER when timer expires
      if (this.deathTimer <= 0) {
        this.gameState = GameState.GAME_OVER;
        this.sound.playGameOver();
        this.sound.playGameOverMusic();
        this.showGameOverOverlay();
      }
      return;
    }

    if (this.gameState !== GameState.PLAYING) return;

    deltaTime = Math.min(deltaTime, 0.1);

    // Tick debug message timer
    if (this.debugMessageTimer > 0) {
      this.debugMessageTimer -= deltaTime;
    }

    this.treeStump.update(deltaTime);

    this.enemyManager.update(
      deltaTime,
      this.canvas,
      this.treeStump.position.x,
      this.treeStump.position.y
    );

    // Collisions don't kill in debug mode
    if (!this.enemyManager.debugMode && this.enemyManager.checkCollisions(this.treeStump)) {
      this.gameState = GameState.DYING;
      this.treeStump.setDead();

      // Death animation parameters
      this.deathFreezeTimer = 0.08;   // 80ms hit-freeze
      this.deathTimer = 0.65;         // remaining animation after freeze
      this.deathFadeAlpha = 0;        // dark fade starts transparent

      // Stop music and play death sound
      this.sound.stopMusic();
      this.sound.playPlayerDeath();

      // Heavy screen shake on death
      this.screenShake.trigger(25);

      // Large shatter explosion at the player position
      this.deathShatterEffects = [];
      for (let i = 0; i < 3; i++) {
        this.deathShatterEffects.push(
          new ShatterEffect(
            { ...this.treeStump.position },
            this.treeStump.radius * (1.2 + i * 0.4),
            '#ff4444'
          )
        );
      }
    }

    for (const proj of this.leafProjectiles) {
      proj.update(deltaTime);
      if (proj.arrived) {
        this.sound.playImpact();
        this.applyKnockback(proj.targetEnemy);

        // Spawn small impact explosion at the enemy's position
        const color = ENEMY_TYPE_COLORS[this.getEnemyType(proj.targetEnemy)];
        this.impactEffects.push(
          new ImpactEffect({ ...proj.targetEnemy.position }, proj.targetEnemy.radius, color)
        );
      }
    }
    this.leafProjectiles = this.leafProjectiles.filter((p) => !p.arrived);

    this.updateKnockbacks(deltaTime);

    for (const enemy of this.enemyManager.getEnemies()) {
      if (enemy.wordCompleted && !enemy.isDestroyed) {
        const hasInflight = this.leafProjectiles.some((p) => p.targetEnemy === enemy);
        if (!hasInflight) {
          enemy.isDestroyed = true;
          if (!enemy.isMinion) {
            this.score += 1;
          }
          const enemyType = this.getEnemyType(enemy);
          if (enemyType === 'sniper') {
            this.sound.playBigExplosion();
            this.screenShake.trigger(15);
            this.bigExplosionEffects.push(
              new BigExplosionEffect({ ...enemy.position }, enemy.radius)
            );
          } else {
            this.sound.playEnemyDestroyed();
            this.screenShake.trigger(5);
            const color = ENEMY_TYPE_COLORS[enemyType];
            this.shatterEffects.push(
              new ShatterEffect({ ...enemy.position }, enemy.radius, color)
            );
          }
        }
      }
    }

    // Update shatter effects
    for (const effect of this.shatterEffects) {
      effect.update(deltaTime);
    }
    this.shatterEffects = this.shatterEffects.filter((e) => !e.isFinished);

    // Update big explosion effects
    for (const effect of this.bigExplosionEffects) {
      effect.update(deltaTime);
    }
    this.bigExplosionEffects = this.bigExplosionEffects.filter((e) => !e.isFinished);

    // Update impact effects
    for (const effect of this.impactEffects) {
      effect.update(deltaTime);
    }
    this.impactEffects = this.impactEffects.filter((e) => !e.isFinished);

    this.screenShake.update(deltaTime);
    this.scoreProgressBar.update(deltaTime);

    // Tick HUD entrance animation
    if (this.hudEntranceProgress < 1) {
      this.hudEntranceProgress = Math.min(1, this.hudEntranceProgress + deltaTime / Game.HUD_ENTRANCE_DURATION);
    }

    this.inputManager.setPlayerPosition(this.treeStump.position);
    this.inputManager.setEnemies(this.enemyManager.getEnemies());

    this.targetLock.setTarget(this.inputManager.getLockedEnemy());
    this.targetLock.update(deltaTime);
  }

  private applyKnockback(enemy: Enemy): void {
    const dx = enemy.position.x - this.treeStump.position.x;
    const dy = enemy.position.y - this.treeStump.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const knockbackSpeed = 50;
    const existing = this.knockbacks.get(enemy);
    const vx = (dx / dist) * knockbackSpeed;
    const vy = (dy / dist) * knockbackSpeed;
    if (existing) {
      existing.vx += vx;
      existing.vy += vy;
    } else {
      this.knockbacks.set(enemy, { vx, vy });
    }
  }

  private updateKnockbacks(deltaTime: number): void {
    const decay = 0.02;
    const friction = Math.pow(decay, deltaTime);
    for (const [enemy, kb] of this.knockbacks) {
      enemy.position.x += kb.vx * deltaTime;
      enemy.position.y += kb.vy * deltaTime;
      kb.vx *= friction;
      kb.vy *= friction;

      if (Math.abs(kb.vx) < 1 && Math.abs(kb.vy) < 1) {
        this.knockbacks.delete(enemy);
      }
    }
  }

  private render(): void {
    this.sunburst.render(this.ctx, this.canvas.width, this.canvas.height);

    if (this.gameState === GameState.PLAYING) {
      // Apply screen shake offset to all game-world rendering
      this.screenShake.apply(this.ctx);

      this.treeStump.render(this.ctx);

      for (const enemy of this.enemyManager.getEnemies()) {
        enemy.render(this.ctx);
      }

      for (const effect of this.shatterEffects) {
        effect.render(this.ctx);
      }

      for (const effect of this.bigExplosionEffects) {
        effect.render(this.ctx);
      }

      for (const effect of this.impactEffects) {
        effect.render(this.ctx);
      }

      this.targetLock.render(this.ctx);

      this.screenShake.restore(this.ctx);

      // ── HUD entrance easing ──
      // easeOutCubic: starts fast, decelerates smoothly
      const t = this.hudEntranceProgress;
      const eased = 1 - Math.pow(1 - t, 3);
      const topOffset = -80 * (1 - eased);      // slides down from above
      const bottomOffset = 80 * (1 - eased);    // slides up from below

      // HUD is drawn without shake so text stays crisp
      this.ctx.save();
      this.ctx.translate(0, topOffset);

      this.ctx.font = `bold 42px "${FONT_DEFAULT}", monospace`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.lineWidth = 4;
      this.ctx.lineJoin = 'round';
      this.ctx.strokeText(`Score: ${this.score}`, 20, 20);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`Score: ${this.score}`, 20, 20);

      if (!this.enemyManager.debugMode) {
        this.enemyManager.renderSurvivalUI(this.ctx, this.canvas.width, this.canvas.height);
      }

      this.ctx.restore();

      // Progress bar slides up from the bottom
      this.ctx.save();
      this.ctx.translate(0, bottomOffset);
      this.scoreProgressBar.render(this.ctx, this.canvas.width, this.canvas.height, this.score, this.leaderboard.getEntries());
      this.ctx.restore();

      if (this.enemyManager.debugMode) {
        this.renderDebugHUD();
      }
    }

    // Death animation rendering – frozen game world + flash + fade to black
    if (this.gameState === GameState.DYING) {
      this.screenShake.apply(this.ctx);

      // Render the stump (in dead state) and all enemies frozen in place
      this.treeStump.render(this.ctx);

      for (const enemy of this.enemyManager.getEnemies()) {
        enemy.render(this.ctx);
      }

      // Death shatter explosion
      for (const effect of this.deathShatterEffects) {
        effect.render(this.ctx);
      }

      this.screenShake.restore(this.ctx);

      // Dark fade overlay (ramps up to match game-over bg)
      if (this.deathFadeAlpha > 0) {
        this.ctx.globalAlpha = this.deathFadeAlpha;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1;
      }
    }

    // In GAME_OVER, apply a semi-transparent dark tint so the sunburst
    // spinning effect stays visible through the overlay.
    // Note: START_SCREEN uses only the CSS overlay for darkening (no canvas tint)
    // to avoid a double-dark flash when the CSS overlay fades out.
    if (this.gameState === GameState.GAME_OVER) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderDebugHUD(): void {
    const ctx = this.ctx;
    const panelX = this.canvas.width - 260;
    const panelY = 20;
    const panelW = 240;
    const panelH = 250;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `16px "${FONT_DEFAULT}", monospace`;
    ctx.fillStyle = 'rgba(255, 200, 50, 1)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DEBUG MODE', panelX + 12, panelY + 12);

    // Enemy type list
    let y = panelY + 40;
    for (let i = 0; i < ENEMY_TYPES.length; i++) {
      const type = ENEMY_TYPES[i];
      const isSelected = type === this.debugSelectedType;

      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(panelX + 6, y - 2, panelW - 12, 22);
      }

      ctx.font = `14px "${FONT_DEFAULT}", monospace`;
      ctx.fillStyle = isSelected ? ENEMY_TYPE_COLORS[type] : 'rgba(180, 180, 180, 0.6)';
      ctx.fillText(
        `${isSelected ? '>' : ' '} [${i + 1}] ${type}`,
        panelX + 12,
        y
      );
      y += 24;
    }

    // Instructions
    y += 8;
    ctx.font = `11px "${FONT_DEFAULT}", monospace`;
    ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
    ctx.fillText('Click to spawn  |  C = clear', panelX + 12, y);
    y += 16;
    ctx.fillText('L = clear leaderboard', panelX + 12, y);
    y += 16;
    ctx.fillText('R = remove leaderboard entry', panelX + 12, y);
    y += 16;
    ctx.fillText('` to exit debug mode', panelX + 12, y);

    // Debug message toast
    if (this.debugMessageTimer > 0 && this.debugMessage) {
      const msgY = this.canvas.height - 60;
      ctx.font = '16px monospace';
      const alpha = Math.min(1, this.debugMessageTimer);
      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.fillText(this.debugMessage, this.canvas.width / 2, msgY);
    }
  }

  private getEnemyType(enemy: Enemy): EnemyType {
    if (enemy instanceof ZigzagNail) return 'zigzag';
    if (enemy instanceof SpawnerNail) return 'spawner';
    if (enemy instanceof TankNail) return 'tank';
    if (enemy instanceof SpeedNail) return 'speed';
    if (enemy instanceof Sniper) return 'sniper';
    return 'nail';
  }

  private showStartScreen(): void {
    this.startNameInput.value = '';
    this.startStumpy.style.visibility = '';

    // Reset any lingering exit animation classes
    const startTitle = this.startOverlay.querySelector('.start-title') as HTMLElement;
    const startBelow = this.startOverlay.querySelector('.start-below-title') as HTMLElement;

    // Disable transitions so the screen appears instantly (no reverse animation)
    this.startOverlay.style.transition = 'none';
    if (startTitle) startTitle.style.transition = 'none';
    if (startBelow) startBelow.style.transition = 'none';

    startTitle?.classList.remove('exit-up');
    startBelow?.classList.remove('exit-down');
    this.startOverlay.classList.remove('exiting');

    this.renderLeaderboardList(this.startLeaderboardList, this.startLeaderboardEmpty);
    this.startOverlay.classList.remove('hidden');

    // Force reflow so the browser applies the non-transitioned state,
    // then restore transitions for future start-game animation
    void this.startOverlay.offsetHeight;
    this.startOverlay.style.transition = '';
    if (startTitle) startTitle.style.transition = '';
    if (startBelow) startBelow.style.transition = '';

    setTimeout(() => this.startNameInput.focus(), 100);
  }

  private startGame(): void {
    const name = this.startNameInput.value.trim();
    if (!name) return;

    this.playerName = name;

    const startTitle = this.startOverlay.querySelector('.start-title') as HTMLElement;
    const startBelow = this.startOverlay.querySelector('.start-below-title') as HTMLElement;

    // ── Phase 1 (0ms): Title flies up, content slides down, stumpy clone created ──
    startTitle?.classList.add('exit-up');
    startBelow?.classList.add('exit-down');

    // Snapshot the stumpy image position before hiding it
    const rect = this.startStumpy.getBoundingClientRect();
    this.startStumpy.style.visibility = 'hidden';

    // Create a flying clone appended to <body>
    const clone = this.startStumpy.cloneNode(true) as HTMLImageElement;
    clone.style.visibility = 'visible';
    clone.removeAttribute('id');
    clone.className = 'stumpy-flying';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    document.body.appendChild(clone);

    // ── Phase 2 (150ms): Overlay background fades, stumpy flies ──
    setTimeout(() => {
      this.startOverlay.classList.add('exiting');

      // Fly stumpy to center
      const targetSize = 120;
      const targetLeft = window.innerWidth / 2 - targetSize / 2;
      const targetTop = window.innerHeight / 2 - targetSize / 2;
      clone.style.left = `${targetLeft}px`;
      clone.style.top = `${targetTop}px`;
      clone.style.width = `${targetSize}px`;
      clone.style.height = `${targetSize}px`;
    }, 150);

    // ── Phase 3: Stumpy arrives → remove clone + start gameplay ──
    // The overlay continues fading on its own (opacity 2s linear) — no display:none needed.
    let started = false;
    const onCloneArrived = () => {
      clone.removeEventListener('transitionend', onCloneArrived);
      clone.remove();
      if (!started) {
        started = true;
        this.beginPlaying();
      }
    };
    clone.addEventListener('transitionend', onCloneArrived);

    // Safety fallback
    setTimeout(() => {
      if (clone.parentElement) clone.remove();
      if (!started) {
        started = true;
        this.beginPlaying();
      }
    }, 1500);
  }

  private beginPlaying(): void {
    if (this.gameState === GameState.PLAYING) return; // guard against double-fire
    this.sound.playGameplayMusic();
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.shatterEffects = [];
    this.bigExplosionEffects = [];
    this.leafProjectiles = [];
    this.knockbacks.clear();
    this.impactEffects = [];
    this.treeStump.reset();
    this.enemyManager.reset();

    // Reset death animation state
    this.deathTimer = 0;
    this.deathFreezeTimer = 0;
    this.deathFlashAlpha = 0;
    this.deathFadeAlpha = 0;
    this.deathShatterEffects = [];

    // Start HUD entrance animation
    this.hudEntranceProgress = 0;

    this.inputManager.focus();
  }

  private goToStartScreen(): void {
    this.hideGameOverOverlay();
    this.gameState = GameState.START_SCREEN;

    // Reset game state
    this.score = 0;
    this.shatterEffects = [];
    this.bigExplosionEffects = [];
    this.leafProjectiles = [];
    this.knockbacks.clear();
    this.impactEffects = [];
    this.treeStump.reset();
    this.enemyManager.reset();

    // Reset death animation state
    this.deathTimer = 0;
    this.deathFreezeTimer = 0;
    this.deathFlashAlpha = 0;
    this.deathFadeAlpha = 0;
    this.deathShatterEffects = [];

    this.showStartScreen();
  }

  public async start(): Promise<void> {
    await this.leaderboard.init();
    this.showStartScreen();
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  public destroy(): void {
    this.abortController.abort();
    this.soundPanel.remove();
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}
