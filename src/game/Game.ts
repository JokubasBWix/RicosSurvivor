import { TreeStump } from '../entities/TreeStump';
import { Nail } from '../entities/Nail';
import { Enemy, GameState } from '../types';
import { InputManager } from './InputManager';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private treeStump: TreeStump;
  private enemies: Enemy[] = [];
  private inputManager: InputManager;
  private gameState: GameState = GameState.PLAYING;
  private score: number = 0;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 2000; // ms
  private words: string[];

  constructor(canvas: HTMLCanvasElement, inputElement: HTMLInputElement, words: string[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.words = words;
    
    this.treeStump = new TreeStump(canvas);
    this.inputManager = new InputManager(inputElement, (enemy) => {
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
  }

  private spawnEnemy(): void {
    const word = this.words[Math.floor(Math.random() * this.words.length)];
    const nail = Nail.spawn360(
      word,
      this.canvas,
      this.treeStump.position.x,
      this.treeStump.position.y
    );
    this.enemies.push(nail);
  }

  private update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    // Cap deltaTime to prevent huge jumps (max 100ms = 0.1s)
    deltaTime = Math.min(deltaTime, 0.1);

    // Update tree stump
    this.treeStump.update();

    // Handle spawning
    this.spawnTimer += deltaTime * 1000;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(deltaTime, this.treeStump.position);

      // Check collision with tree stump
      if (enemy.checkCollision(this.treeStump)) {
        this.gameState = GameState.GAME_OVER;
      }
    }

    // Update input manager with current enemies (for event-driven input)
    this.inputManager.setEnemies(this.enemies);

    // Remove destroyed enemies and off-screen enemies
    this.enemies = this.enemies.filter(
      enemy => !enemy.isDestroyed && !enemy.isOffScreen(this.canvas)
    );
  }

  private render(): void {
    // Clear screen
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameState === GameState.PLAYING) {
      // Render tree stump
      this.treeStump.render(this.ctx);

      // Render enemies
      for (const enemy of this.enemies) {
        enemy.render(this.ctx);
      }

      // Render score
      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Score: ${this.score}`, 20, 40);

      // Render enemy count (debug)
      this.ctx.fillText(`Enemies: ${this.enemies.length}`, 20, 70);
    } else if (this.gameState === GameState.GAME_OVER) {
      // Game over screen
      this.ctx.font = '48px monospace';
      this.ctx.fillStyle = 'red';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);

      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
      this.ctx.fillText('Refresh to restart', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}
