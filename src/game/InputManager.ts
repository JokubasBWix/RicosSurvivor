import { Enemy, Position } from '../types';

export class InputManager {
  private inputElement: HTMLInputElement;
  private onEnemyDestroyed: (enemy: Enemy) => void;
  private onCorrectLetter: ((enemy: Enemy) => void) | null;
  private onWrongLetter: (() => void) | null;
  private enemies: Enemy[] = [];
  private lockedEnemy: Enemy | null = null;
  private typedIndex: number = 0;
  private playerPosition: Position = { x: 0, y: 0 };

  constructor(
    inputElement: HTMLInputElement,
    onEnemyDestroyed: (enemy: Enemy) => void,
    onCorrectLetter?: (enemy: Enemy) => void,
    onWrongLetter?: () => void
  ) {
    this.inputElement = inputElement;
    this.onEnemyDestroyed = onEnemyDestroyed;
    this.onCorrectLetter = onCorrectLetter ?? null;
    this.onWrongLetter = onWrongLetter ?? null;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when a visible input/textarea is focused (e.g. name input on game over)
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
        active !== this.inputElement
      ) {
        return;
      }

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
      if (key !== expected) {
        this.onWrongLetter?.();
        return;
      }

      this.typedIndex++;
      this.lockedEnemy.typed = this.lockedEnemy.word.substring(0, this.typedIndex);
      this.onCorrectLetter?.(this.lockedEnemy);

      if (this.typedIndex >= this.lockedEnemy.word.length) {
        this.completeWord(this.lockedEnemy);
        this.unlock();
      }
    } else {
      const candidates = this.enemies.filter(
        (e) => !e.isDestroyed && !e.wordCompleted && e.word[0] === key
      );
      if (candidates.length === 0) {
        this.onWrongLetter?.();
        return;
      }

      const target = candidates.reduce((closest, e) => {
        return this.distanceToPlayer(e) < this.distanceToPlayer(closest) ? e : closest;
      });

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

  setPlayerPosition(pos: Position): void {
    this.playerPosition = pos;
  }

  private distanceToPlayer(enemy: Enemy): number {
    const dx = enemy.position.x - this.playerPosition.x;
    const dy = enemy.position.y - this.playerPosition.y;
    return dx * dx + dy * dy;
  }

  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;

    if (this.lockedEnemy && (this.lockedEnemy.isDestroyed || this.lockedEnemy.wordCompleted || !enemies.includes(this.lockedEnemy))) {
      this.unlock();
    }
  }

  getLockedEnemy(): Enemy | null {
    return this.lockedEnemy;
  }

  focus(): void {
    this.inputElement.focus();
  }
}
