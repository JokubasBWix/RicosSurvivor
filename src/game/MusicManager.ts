import themeSrc from '../assets/audio/gameplay.mp3';

export class MusicManager {
  private gameplay: HTMLAudioElement;
  private current: HTMLAudioElement | null = null;
  private fadeRaf: number = 0;
  private retryAbort: AbortController | null = null;

  constructor() {
    this.gameplay = this.createTrack(themeSrc);
  }

  private createTrack(src: string): HTMLAudioElement {
    const el = new Audio(src);
    el.loop = true;
    el.volume = 0;
    return el;
  }

  playGameplay(): void {
    this.stopAll();
    this.current = this.gameplay;
    this.gameplay.currentTime = 0;
    this.gameplay.play().then(() => {
      if (this.current === this.gameplay) this.fadeIn(this.gameplay, 0.5);
    }).catch(() => {
      // Autoplay blocked — retry on first user interaction
      const ac = new AbortController();
      this.retryAbort = ac;
      const retry = () => {
        ac.abort();
        if (this.current !== this.gameplay) return;
        this.gameplay.play().then(() => {
          if (this.current === this.gameplay) this.fadeIn(this.gameplay, 0.5);
        }).catch(() => {});
      };
      document.addEventListener('keydown', retry, { once: true, signal: ac.signal });
      document.addEventListener('pointerdown', retry, { once: true, signal: ac.signal });
    });
  }

  playGameOver(): void {
    // No-op until a game-over track is added
  }

  stopAll(): void {
    cancelAnimationFrame(this.fadeRaf);
    if (this.retryAbort) {
      this.retryAbort.abort();
      this.retryAbort = null;
    }
    if (this.current) {
      this.fadeOut(this.current, 0.5);
      this.current = null;
    }
  }

  setMuted(muted: boolean): void {
    this.gameplay.muted = muted;
  }

  private fadeIn(el: HTMLAudioElement, duration: number): void {
    cancelAnimationFrame(this.fadeRaf);
    const target = 0.2;
    el.volume = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      el.volume = Math.min(target, el.volume + (target / duration) * dt);
      if (el.volume < target) {
        this.fadeRaf = requestAnimationFrame(step);
      }
    };
    this.fadeRaf = requestAnimationFrame(step);
  }

  private fadeOut(el: HTMLAudioElement, duration: number): void {
    cancelAnimationFrame(this.fadeRaf);
    const start = el.volume;
    if (start <= 0) {
      el.pause();
      return;
    }
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      el.volume = Math.max(0, el.volume - (start / duration) * dt);
      if (el.volume > 0) {
        this.fadeRaf = requestAnimationFrame(step);
      } else {
        el.pause();
      }
    };
    this.fadeRaf = requestAnimationFrame(step);
  }
}
