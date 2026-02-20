import { TreeStump } from '../entities/TreeStump';
import { EnemyType, GameState } from '../types';
import { InputManager } from './InputManager';
import { EnemyManager } from './EnemyManager';
import { SunburstBackground } from './SunburstBackground';

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
  private gameState: GameState = GameState.PLAYING;
  private score: number = 0;
  private lastTime: number = 0;

  private debugSelectedType: EnemyType = 'nail';

  constructor(canvas: HTMLCanvasElement, inputElement: HTMLInputElement, words: string[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.treeStump = new TreeStump(canvas);
    this.enemyManager = new EnemyManager(words);
    this.sunburst = new SunburstBackground();
    this.inputManager = new InputManager(inputElement, () => {
      this.score++;
    });

    this.setupCanvas();
    this.setupEventListeners();
    this.inputManager.focus();
  }

  private setupCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.treeStump.resize(this.canvas);
    });

    window.addEventListener('keydown', (e) => {
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
    });

    this.canvas.addEventListener('click', (e) => {
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

  private update(deltaTime: number): void {
    this.sunburst.update(deltaTime, this.enemyManager.currentWave);

    if (this.gameState !== GameState.PLAYING) return;

    deltaTime = Math.min(deltaTime, 0.1);

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
    }

    this.inputManager.setEnemies(this.enemyManager.getEnemies());
  }

  private render(): void {
    this.sunburst.render(this.ctx, this.canvas.width, this.canvas.height);

    if (this.gameState === GameState.PLAYING) {
      this.treeStump.render(this.ctx);

      for (const enemy of this.enemyManager.getEnemies()) {
        enemy.render(this.ctx);
      }

      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = '#3a3a3a';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`Score: ${this.score}`, 20, 40);
      this.ctx.fillText(`Enemies: ${this.enemyManager.getEnemies().length}`, 20, 70);

      if (!this.enemyManager.debugMode) {
        this.enemyManager.renderWaveUI(this.ctx, this.canvas.width, this.canvas.height);
      }

      if (this.enemyManager.debugMode) {
        this.renderDebugHUD();
      }
    } else if (this.gameState === GameState.GAME_OVER) {
      this.ctx.font = '48px monospace';
      this.ctx.fillStyle = '#cc2222';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);

      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = '#3a3a3a';
      this.ctx.fillText(
        `Final Score: ${this.score}`,
        this.canvas.width / 2,
        this.canvas.height / 2 + 20
      );
      this.ctx.fillText(
        `Reached Wave ${this.enemyManager.currentWave}`,
        this.canvas.width / 2,
        this.canvas.height / 2 + 60
      );
      this.ctx.fillText(
        'Refresh to restart',
        this.canvas.width / 2,
        this.canvas.height / 2 + 100
      );
    }
  }

  private renderDebugHUD(): void {
    const ctx = this.ctx;
    const panelX = this.canvas.width - 260;
    const panelY = 20;
    const panelW = 240;
    const panelH = 234;

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
    ctx.fillText('` to exit debug mode', panelX + 12, y);
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
