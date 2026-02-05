import { Enemy } from '../types';

export class InputManager {
  private inputElement: HTMLInputElement;
  private onEnemyDestroyed: (enemy: Enemy) => void;
  private enemies: Enemy[] = [];

  constructor(inputElement: HTMLInputElement, onEnemyDestroyed: (enemy: Enemy) => void) {
    this.inputElement = inputElement;
    this.onEnemyDestroyed = onEnemyDestroyed;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.inputElement.addEventListener('input', () => {
      this.handleInput();
    });
  }

  private handleInput(): void {
    const value = this.inputElement.value.toLowerCase();
    if (!value) {
      // Clear typed status on all enemies
      for (const enemy of this.enemies) {
        enemy.typed = '';
      }
      return;
    }

    // Process input only when it changes (event-driven)
    for (const enemy of this.enemies) {
      if (enemy.word.startsWith(value)) {
        enemy.typed = value;

        if (value === enemy.word) {
          enemy.isDestroyed = true;
          this.onEnemyDestroyed(enemy);
          this.clear();
        }
        break; // Only target one enemy at a time
      } else {
        enemy.typed = ''; // Clear if no longer matching
      }
    }
  }

  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;
  }

  clear(): void {
    this.inputElement.value = '';
  }

  focus(): void {
    this.inputElement.focus();
  }
}
