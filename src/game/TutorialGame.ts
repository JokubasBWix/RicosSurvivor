import { TreeStump } from '../entities/TreeStump';
import { SunburstBackground } from './SunburstBackground';
import { ScreenShake } from './ScreenShake';
import { SoundManager } from './SoundManager';
import { TutorialScenario, TutorialAction } from './TutorialScenario';

export class TutorialGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private treeStump: TreeStump;
  private sunburst: SunburstBackground;
  private screenShake: ScreenShake = new ScreenShake();
  private sound: SoundManager = new SoundManager();
  private scenarios: TutorialScenario[] = [];
  private lastTime: number = 0;
  private embedded: boolean;

  private baseInnerWidth: number;
  private baseInnerHeight: number;
  private lastOuterWidth: number;
  private lastOuterHeight: number;

  constructor(canvas: HTMLCanvasElement, scenarioDefinitions: TutorialAction[][], options?: { muted?: boolean; embedded?: boolean }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.embedded = options?.embedded ?? false;

    if (options?.muted) {
      this.sound.setMuted(true);
    }

    this.baseInnerWidth = window.innerWidth;
    this.baseInnerHeight = window.innerHeight;
    this.lastOuterWidth = window.outerWidth;
    this.lastOuterHeight = window.outerHeight;

    this.setupCanvas();
    this.treeStump = new TreeStump(canvas);
    this.sunburst = new SunburstBackground();

    const scenarioCtx = {
      canvas: this.canvas,
      treeStump: this.treeStump,
      sound: this.sound,
      screenShake: this.screenShake,
    };

    for (const actions of scenarioDefinitions) {
      this.scenarios.push(new TutorialScenario(actions, scenarioCtx));
    }

    // Sync mute button
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.textContent = this.sound.muted ? '🔇' : '🔊';
      muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
      });
    }

    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.treeStump.resize(this.canvas);
    });
  }

  private setupCanvas(): void {
    const outerW = window.outerWidth;
    const outerH = window.outerHeight;

    const outerWChanged = Math.abs(outerW - this.lastOuterWidth) > 5;
    const outerHChanged = Math.abs(outerH - this.lastOuterHeight) > 5;

    if (outerWChanged || outerHChanged) {
      if (outerWChanged && this.lastOuterWidth > 0) {
        this.baseInnerWidth = Math.round(this.baseInnerWidth * (outerW / this.lastOuterWidth));
      }
      if (outerHChanged && this.lastOuterHeight > 0) {
        this.baseInnerHeight = Math.round(this.baseInnerHeight * (outerH / this.lastOuterHeight));
      }
      this.lastOuterWidth = outerW;
      this.lastOuterHeight = outerH;
    }

    this.canvas.width = this.baseInnerWidth;
    this.canvas.height = this.baseInnerHeight;
  }

  start(): void {
    this.lastTime = performance.now();
    if (this.embedded) {
      this.embeddedLoop();
    } else {
      this.gameLoop(this.lastTime);
    }
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private embeddedLoop = (): void => {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    setTimeout(this.embeddedLoop, 16);
  };

  private update(deltaTime: number): void {
    this.sunburst.update(deltaTime, 0);
    this.treeStump.update(deltaTime);
    this.screenShake.update(deltaTime);

    for (const scenario of this.scenarios) {
      scenario.update(deltaTime);
    }
  }

  private render(): void {
    this.sunburst.render(this.ctx, this.canvas.width, this.canvas.height);

    this.screenShake.apply(this.ctx);
    this.treeStump.render(this.ctx);
    for (const scenario of this.scenarios) {
      scenario.renderWorld(this.ctx);
    }
    this.screenShake.restore(this.ctx);

    for (const scenario of this.scenarios) {
      scenario.renderHUD(this.ctx);
    }
  }
}
