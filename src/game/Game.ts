import { TreeStump } from '../entities/TreeStump';
import { EnemyType, GameState } from '../types';
import { InputManager } from './InputManager';
import { EnemyManager } from './EnemyManager';
import { Leaderboard } from './Leaderboard';

const ENEMY_TYPES: EnemyType[] = ['nail', 'zigzag', 'spawner', 'tank', 'speed'];

const ENEMY_TYPE_COLORS: Record<EnemyType, string> = {
  nail:    '#ff9966',
  zigzag:  '#6688ff',
  spawner: '#ff66ff',
  tank:    '#ff6666',
  speed:   '#66ff66'
};

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private treeStump: TreeStump;
  private enemyManager: EnemyManager;
  private inputManager: InputManager;
  private gameState: GameState = GameState.PLAYING;
  private score: number = 0;
  private lastTime: number = 0;

  // Leaderboard
  private leaderboard: Leaderboard;

  // Overlay DOM refs
  private overlay: HTMLDivElement;
  private overlayScore: HTMLElement;
  private overlayWave: HTMLElement;
  private playerNameInput: HTMLInputElement;
  private saveBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;
  private nameInputSection: HTMLElement;
  private leaderboardList: HTMLOListElement;
  private leaderboardEmpty: HTMLElement;
  private scoreSaved: boolean = false;

  // Debug mode
  private debugSelectedType: EnemyType = 'nail';
  private debugMessage: string = '';
  private debugMessageTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, inputElement: HTMLInputElement, words: string[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.treeStump = new TreeStump(canvas);
    this.enemyManager = new EnemyManager(words);
    this.inputManager = new InputManager(inputElement, () => {
      this.score++;
    });

    this.leaderboard = new Leaderboard();

    // Grab overlay DOM elements
    this.overlay = document.getElementById('game-over-overlay') as HTMLDivElement;
    this.overlayScore = document.getElementById('overlay-score')!;
    this.overlayWave = document.getElementById('overlay-wave')!;
    this.playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    this.saveBtn = document.getElementById('save-score-btn') as HTMLButtonElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    this.nameInputSection = document.getElementById('name-input-section')!;
    this.leaderboardList = document.getElementById('leaderboard-list') as HTMLOListElement;
    this.leaderboardEmpty = document.getElementById('leaderboard-empty')!;

    this.setupCanvas();
    this.setupEventListeners();
    this.setupOverlayListeners();
    this.inputManager.focus();
  }

  private setupCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupOverlayListeners(): void {
    this.saveBtn.addEventListener('click', () => {
      const name = this.playerNameInput.value.trim();
      if (!name) return;
      this.leaderboard.addEntry(name, this.score, this.enemyManager.currentWave);
      this.scoreSaved = true;
      this.nameInputSection.classList.add('hidden');
      this.renderLeaderboardList();
    });

    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });

    // Allow Enter key in name input to save
    this.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveBtn.click();
      }
      // Prevent Tab from propagating when overlay is open
      if (e.key === 'Tab') {
        e.stopPropagation();
      }
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.treeStump.resize(this.canvas);
    });

    window.addEventListener('keydown', (e) => {
      // Tab to restart when game over
      if (e.key === 'Tab' && this.gameState === GameState.GAME_OVER) {
        e.preventDefault();
        this.restart();
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
        this.leaderboard.clear();
        this.showDebugMessage('Leaderboard cleared');
      }

      // R prompts to remove a leaderboard entry
      if (e.key === 'r' || e.key === 'R') {
        this.promptRemoveLeaderboardEntry();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.gameState === GameState.GAME_OVER) return;

      if (!this.enemyManager.debugMode) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      this.enemyManager.spawnAtPosition(
        this.debugSelectedType,
        { x: clickX, y: clickY },
        this.treeStump.position
      );
    });
  }

  private showDebugMessage(msg: string): void {
    this.debugMessage = msg;
    this.debugMessageTimer = 2;
  }

  private promptRemoveLeaderboardEntry(): void {
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
    this.leaderboard.removeEntry(idx);
    this.showDebugMessage(`Removed: ${removed.name}`);
  }

  private showGameOverOverlay(): void {
    this.overlayScore.textContent = `Final Score: ${this.score}`;
    this.overlayWave.textContent = `Reached Wave ${this.enemyManager.currentWave}`;
    this.playerNameInput.value = '';
    this.scoreSaved = false;
    this.nameInputSection.classList.remove('hidden');
    this.renderLeaderboardList();
    this.overlay.classList.remove('hidden');

    // Focus the name input after a short delay so it's visible
    setTimeout(() => this.playerNameInput.focus(), 50);
  }

  private hideGameOverOverlay(): void {
    this.overlay.classList.add('hidden');
  }

  private renderLeaderboardList(): void {
    const entries = this.leaderboard.getEntries();
    this.leaderboardList.innerHTML = '';

    if (entries.length === 0) {
      this.leaderboardEmpty.classList.remove('hidden');
      return;
    }

    this.leaderboardEmpty.classList.add('hidden');

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const li = document.createElement('li');

      // Highlight the just-saved entry
      if (
        this.scoreSaved &&
        entry.name === this.playerNameInput.value.trim() &&
        entry.score === this.score
      ) {
        li.classList.add('highlight');
      }

      li.innerHTML = `
        <span class="rank">${i + 1}.</span>
        <span class="entry-name">${this.escapeHtml(entry.name)}</span>
        <span class="entry-score">${entry.score}</span>
      `;
      this.leaderboardList.appendChild(li);
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    deltaTime = Math.min(deltaTime, 0.1);

    // Tick debug message timer
    if (this.debugMessageTimer > 0) {
      this.debugMessageTimer -= deltaTime;
    }

    this.treeStump.update();

    this.enemyManager.update(
      deltaTime,
      this.canvas,
      this.treeStump.position.x,
      this.treeStump.position.y
    );

    // Collisions don't kill in debug mode
    if (!this.enemyManager.debugMode && this.enemyManager.checkCollisions(this.treeStump)) {
      this.gameState = GameState.GAME_OVER;
      this.showGameOverOverlay();
    }

    this.inputManager.setEnemies(this.enemyManager.getEnemies());
  }

  private render(): void {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameState === GameState.PLAYING) {
      this.treeStump.render(this.ctx);

      for (const enemy of this.enemyManager.getEnemies()) {
        enemy.render(this.ctx);
      }

      // Score
      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`Score: ${this.score}`, 20, 40);
      this.ctx.fillText(`Enemies: ${this.enemyManager.getEnemies().length}`, 20, 70);

      // Wave UI (hidden in debug mode)
      if (!this.enemyManager.debugMode) {
        this.enemyManager.renderWaveUI(this.ctx, this.canvas.width, this.canvas.height);
      }

      // Debug HUD
      if (this.enemyManager.debugMode) {
        this.renderDebugHUD();
      }
    }
    // Game over rendering is handled by the HTML overlay
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

    // Title
    ctx.font = '16px monospace';
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

      ctx.font = '14px monospace';
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
    ctx.font = '11px monospace';
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

  private restart(): void {
    this.hideGameOverOverlay();
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.enemyManager.reset();
    this.inputManager.clear();
    this.inputManager.focus();
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}
