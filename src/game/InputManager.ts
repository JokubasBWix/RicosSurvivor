import { Enemy } from '../types';

export class InputManager {
  private inputElement: HTMLInputElement;
  private onEnemyDestroyed: (enemy: Enemy) => void;
  private onCorrectLetter: ((enemy: Enemy) => void) | null;
  private enemies: Enemy[] = [];
  private lockedEnemy: Enemy | null = null;
  private typedIndex: number = 0;

  constructor(
    inputElement: HTMLInputElement,
    onEnemyDestroyed: (enemy: Enemy) => void,
    onCorrectLetter?: (enemy: Enemy) => void
  ) {
    this.inputElement = inputElement;
    this.onEnemyDestroyed = onEnemyDestroyed;
    this.onCorrectLetter = onCorrectLetter ?? null;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key < 'a' || key > 'z') return;

      e.preventDefault();
      this.handleKey(key);
    });
  }

  private handleKey(key: string): void {
    if (this.lockedEnemy) {
      const expected = this.lockedEnemy.word[this.typedIndex];
      if (key !== expected) return;

      this.typedIndex++;
      this.lockedEnemy.typed = this.lockedEnemy.word.substring(0, this.typedIndex);
      this.onCorrectLetter?.(this.lockedEnemy);

      if (this.typedIndex >= this.lockedEnemy.word.length) {
        this.completeWord(this.lockedEnemy);
        this.unlock();
      }
    } else {
      const target = this.enemies.find((e) => !e.isDestroyed && !e.wordCompleted && e.word[0] === key);
      if (!target) return;

      this.lockedEnemy = target;
      this.typedIndex = 1;
      target.typed = target.word.substring(0, 1);
      this.onCorrectLetter?.(target);

      if (target.word.length === 1) {
        this.completeWord(target);
        this.unlock();
      }
    }
  }

  private completeWord(enemy: Enemy): void {
    enemy.wordCompleted = true;
  }

  private unlock(): void {
    if (this.lockedEnemy) {
      this.lockedEnemy.typed = '';
    }
    this.lockedEnemy = null;
    this.typedIndex = 0;
  }

  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;

    if (this.lockedEnemy && (this.lockedEnemy.isDestroyed || this.lockedEnemy.wordCompleted || !enemies.includes(this.lockedEnemy))) {
      this.unlock();
    }
  }

  focus(): void {
    this.inputElement.focus();
  }
}
