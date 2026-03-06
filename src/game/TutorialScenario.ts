import { Enemy, EnemyType, Position, Velocity } from '../types';

import { Nail } from '../entities/Nail';
import { SpeedNail } from '../entities/SpeedNail';
import { LeafProjectile } from '../entities/LeafProjectile';
import { TreeStump } from '../entities/TreeStump';
import { ShatterEffect } from './ShatterEffect';
import { ImpactEffect } from './ImpactEffect';
import { ScreenShake } from './ScreenShake';
import { SoundManager } from './SoundManager';
import { TargetLockRenderer } from './TargetLockRenderer';
import { KeyPressDisplay } from './KeyPressDisplay';

const ENEMY_TYPE_COLORS: Record<EnemyType, string> = {
  nail:    '#ff9966',
  zigzag:  '#6688ff',
  stalker: '#ff66ff',
  tank:    '#ff6666',
  speed:   '#66ff66',
  sniper:  '#ff4444'
};

export type TutorialAction =
  | { type: 'spawn'; enemyType: EnemyType; word: string; offset: Position; speed: number }
  | { type: 'wait'; duration: number }
  | { type: 'lock'; targetWord: string }
  | { type: 'typeLetter'; delay: number }
  | { type: 'space' }
  | { type: 'waitDestroyed'; word: string };

interface ScenarioContext {
  canvas: HTMLCanvasElement;
  treeStump: TreeStump;
  sound: SoundManager;
  screenShake: ScreenShake;
}

export class TutorialScenario {
  private actions: TutorialAction[];
  private ctx: ScenarioContext;

  private actionIndex: number = 0;
  private timer: number = 0;
  private waitingForDestroyed: string | null = null;

  private lockedEnemy: Enemy | null = null;
  private typedIndex: number = 0;

  public enemies: Enemy[] = [];
  public leafProjectiles: LeafProjectile[] = [];
  public shatterEffects: ShatterEffect[] = [];
  public impactEffects: ImpactEffect[] = [];
  public targetLock: TargetLockRenderer = new TargetLockRenderer();
  public keyPressDisplay: KeyPressDisplay = new KeyPressDisplay();

  private knockbacks: Map<Enemy, { vx: number; vy: number }> = new Map();

  constructor(actions: TutorialAction[], ctx: ScenarioContext) {
    this.actions = actions;
    this.ctx = ctx;
  }

  update(deltaTime: number): void {
    this.updateEnemies(deltaTime);
    this.updateProjectiles(deltaTime);
    this.processDestroyedEnemies();
    this.enemies = this.enemies.filter(e => !e.isDestroyed);
    this.updateKnockbacks(deltaTime);
    this.updateEffects(deltaTime);

    this.targetLock.setTarget(this.lockedEnemy);
    this.targetLock.update(deltaTime);
    this.keyPressDisplay.update(deltaTime);

    this.stepTimeline(deltaTime);
  }

  renderWorld(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      if (!enemy.isDestroyed && enemy !== this.lockedEnemy) {
        enemy.render(ctx);
      }
    }
    if (this.lockedEnemy && !this.lockedEnemy.isDestroyed) {
      this.lockedEnemy.render(ctx);
    }

    for (const effect of this.shatterEffects) {
      effect.render(ctx);
    }
    for (const effect of this.impactEffects) {
      effect.render(ctx);
    }

    this.targetLock.render(ctx);
  }

  renderHUD(ctx: CanvasRenderingContext2D): void {
    this.keyPressDisplay.render(ctx);
  }

  private stepTimeline(deltaTime: number): void {
    if (this.actionIndex >= this.actions.length) {
      if (this.allEffectsFinished()) {
        this.reset();
      }
      return;
    }

    if (this.waitingForDestroyed) {
      const enemy = this.enemies.find(e => e.word === this.waitingForDestroyed);
      if (!enemy || enemy.isDestroyed) {
        const hasInflight = enemy
          ? this.leafProjectiles.some(p => p.targetEnemy === enemy)
          : false;
        if (!hasInflight) {
          this.waitingForDestroyed = null;
          this.actionIndex++;
        }
      }
      return;
    }

    if (this.timer > 0) {
      this.timer -= deltaTime;
      return;
    }

    const action = this.actions[this.actionIndex];

    switch (action.type) {
      case 'spawn':
        this.spawnEnemy(action);
        this.actionIndex++;
        break;

      case 'wait':
        this.timer = action.duration;
        this.actionIndex++;
        break;

      case 'lock':
        this.lockTarget(action.targetWord);
        this.actionIndex++;
        break;

      case 'typeLetter':
        this.typeNextLetter();
        this.timer = action.delay;
        this.actionIndex++;
        break;

      case 'space':
        this.dropLock();
        this.actionIndex++;
        break;

      case 'waitDestroyed':
        this.waitingForDestroyed = action.word;
        break;
    }
  }

  private spawnEnemy(action: { enemyType: EnemyType; word: string; offset: Position; speed: number }): void {
    const stumpPos = this.ctx.treeStump.position;
    const spawnPos: Position = {
      x: stumpPos.x + action.offset.x,
      y: stumpPos.y + action.offset.y,
    };
    const dx = stumpPos.x - spawnPos.x;
    const dy = stumpPos.y - spawnPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const velocity: Velocity = {
      x: (dx / dist) * action.speed,
      y: (dy / dist) * action.speed,
    };

    let enemy: Enemy;
    switch (action.enemyType) {
      case 'speed':
        enemy = new SpeedNail(action.word, spawnPos, velocity);
        break;
      case 'nail':
      default:
        enemy = new Nail(action.word, spawnPos, velocity);
        break;
    }
    this.enemies.push(enemy);
  }

  private lockTarget(word: string): void {
    const target = this.enemies.find(
      e => e.word === word && !e.isDestroyed && !e.wordCompleted
    );
    if (target) {
      this.lockedEnemy = target;
      target.isTargeted = true;
      this.typedIndex = target.typed.length;
    }
  }

  private typeNextLetter(): void {
    if (!this.lockedEnemy) return;

    const letter = this.lockedEnemy.word[this.typedIndex];
    this.keyPressDisplay.pressKey(letter);
    this.typedIndex++;
    this.lockedEnemy.typed = this.lockedEnemy.word.substring(0, this.typedIndex);
    this.lockedEnemy.typedScale = 1.35;

    this.ctx.sound.playCorrectLetter();
    this.ctx.treeStump.triggerAttack();
    this.ctx.screenShake.trigger(1.5);

    this.leafProjectiles.push(
      new LeafProjectile(
        { ...this.ctx.treeStump.position },
        this.lockedEnemy,
        this.ctx.canvas
      )
    );

    if (this.typedIndex >= this.lockedEnemy.word.length) {
      this.lockedEnemy.wordCompleted = true;
      this.lockedEnemy.isTargeted = false;
      this.lockedEnemy = null;
      this.typedIndex = 0;
    }
  }

  private dropLock(): void {
    if (this.lockedEnemy) {
      this.lockedEnemy.isTargeted = false;
    }
    this.keyPressDisplay.pressSpace();
    this.lockedEnemy = null;
    this.typedIndex = 0;
  }

  private updateEnemies(deltaTime: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.isDestroyed) {
        enemy.update(deltaTime, this.ctx.treeStump.position);
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (const proj of this.leafProjectiles) {
      proj.update(deltaTime);
      if (proj.arrived) {
        this.ctx.sound.playImpact();
        this.applyKnockback(proj.targetEnemy);

        const color = ENEMY_TYPE_COLORS[this.getEnemyType(proj.targetEnemy)];
        this.impactEffects.push(
          new ImpactEffect({ ...proj.targetEnemy.position }, proj.targetEnemy.radius, color)
        );
      }
    }
    this.leafProjectiles = this.leafProjectiles.filter(p => !p.arrived);
  }

  private processDestroyedEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.wordCompleted && !enemy.isDestroyed) {
        const hasInflight = this.leafProjectiles.some(p => p.targetEnemy === enemy);
        if (!hasInflight) {
          enemy.isDestroyed = true;
          this.ctx.sound.playEnemyDestroyed();
          this.ctx.screenShake.trigger(5);
          const color = ENEMY_TYPE_COLORS[this.getEnemyType(enemy)];
          this.shatterEffects.push(
            new ShatterEffect({ ...enemy.position }, enemy.radius, color)
          );
        }
      }
    }
  }

  private applyKnockback(enemy: Enemy): void {
    const dx = enemy.position.x - this.ctx.treeStump.position.x;
    const dy = enemy.position.y - this.ctx.treeStump.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const knockbackSpeed = 50;
    const vx = (dx / dist) * knockbackSpeed;
    const vy = (dy / dist) * knockbackSpeed;
    const existing = this.knockbacks.get(enemy);
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

  private updateEffects(deltaTime: number): void {
    for (const effect of this.shatterEffects) effect.update(deltaTime);
    this.shatterEffects = this.shatterEffects.filter(e => !e.isFinished);

    for (const effect of this.impactEffects) effect.update(deltaTime);
    this.impactEffects = this.impactEffects.filter(e => !e.isFinished);
  }

  private allEffectsFinished(): boolean {
    return (
      this.shatterEffects.length === 0 &&
      this.impactEffects.length === 0 &&
      this.leafProjectiles.length === 0
    );
  }

  private reset(): void {
    for (const proj of this.leafProjectiles) proj.destroy();
    this.leafProjectiles = [];
    this.enemies = [];
    this.shatterEffects = [];
    this.impactEffects = [];
    this.knockbacks.clear();
    this.lockedEnemy = null;
    this.typedIndex = 0;
    this.actionIndex = 0;
    this.timer = 0;
    this.waitingForDestroyed = null;
  }

  private getEnemyType(enemy: Enemy): EnemyType {
    if (enemy instanceof SpeedNail) return 'speed';
    return 'nail';
  }
}
