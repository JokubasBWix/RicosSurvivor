import * as SD from './SoundDesigns';
import { preloadSamples } from './SoundDesigns';
import { MusicManager } from './MusicManager';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted: boolean = localStorage.getItem('muted') === 'true';
  private _catalogueStopLoop?: () => void;
  private music: MusicManager = new MusicManager();

  constructor() {
    this.music.setMuted(this._muted);
  }

  /** Lazily create AudioContext on first use (satisfies browser autoplay policy) */
  private ensureContext(): { ctx: AudioContext; dest: GainNode } | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this._muted ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);
        preloadSamples(this.ctx);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return { ctx: this.ctx, dest: this.masterGain! };
  }

  // ── Volume / Mute ─────────────────────────────────────────────────

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    localStorage.setItem('muted', String(muted));
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
    this.music.setMuted(muted);
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  // ── Play methods ──────────────────────────────────────────────────

  private play(fn: (ctx: AudioContext, dest: AudioNode) => void): void {
    const a = this.ensureContext();
    if (a) fn(a.ctx, a.dest);
  }

  playCorrectLetter(): void { this.play(SD.playCorrectLetter); }
  playWrongLetter(): void { this.play(SD.playWrongLetter); }
  playShoot(): void { this.play(SD.playShoot); }
  playImpact(): void { this.play(SD.playImpact); }
  playEnemyDestroyed(): void { this.play(SD.playEnemyDestroyed); }
  playBigExplosion(): void { this.play(SD.playBigExplosion); }
  playPlayerDeath(): void { this.play(SD.playPlayerDeath); }
  playGameOver(): void { this.play(SD.playGameOver); }
  stopGameOver(): void { SD.stopGameOver(); }
  playSniperShoot(): void { this.play(SD.playSniperShoot); }
  startTankSpinLoop(): (() => void) | null {
    const a = this.ensureContext();
    if (!a) return null;
    return SD.startTankSpinLoop(a.ctx, a.dest);
  }
  playSpawnerSpawn(): void { this.play(SD.playSpawnerSpawn); }

  startChainsawLoop(): (() => void) | null {
    const a = this.ensureContext();
    if (!a) return null;
    return SD.startChainsawLoop(a.ctx, a.dest);
  }

  startDrillLoop(): (() => void) | null {
    const a = this.ensureContext();
    if (!a) return null;
    return SD.startDrillLoop(a.ctx, a.dest);
  }

  startCircularSawLoop(): (() => void) | null {
    const a = this.ensureContext();
    if (!a) return null;
    return SD.startCircularSawLoop(a.ctx, a.dest);
  }

  // ── Music ───────────────────────────────────────────────────────────

  playStartScreenMusic(): void {
    this.music.playStartScreen();
  }

  playGameplayMusic(): void {
    this.music.playGameplay();
  }

  stopMusic(): void {
    this.music.stopAll();
  }

  // ── Sound catalogue (for debug panel) ──────────────────────────────

  getSoundCatalogue(): { name: string; description: string; play: () => void; stop?: () => void }[] {
    return [
      { name: 'correctLetter', description: 'Correct letter typed', play: () => this.playCorrectLetter() },
      { name: 'wrongLetter', description: 'Wrong letter typed', play: () => this.playWrongLetter() },
      { name: 'shoot', description: 'Leaf projectile fired', play: () => this.playShoot() },
      { name: 'impact', description: 'Projectile hits enemy', play: () => this.playImpact() },
      { name: 'enemyDestroyed', description: 'Enemy word completed', play: () => this.playEnemyDestroyed() },
      { name: 'bigExplosion', description: 'Sniper destroyed', play: () => this.playBigExplosion() },
      { name: 'playerDeath', description: 'Player killed', play: () => this.playPlayerDeath() },
      { name: 'sniperShoot', description: 'Sniper fires a bullet', play: () => this.playSniperShoot() },
      { name: 'tankSpinLoop', description: 'Tank spin loop', play: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = this.startTankSpinLoop() ?? undefined; }, stop: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = undefined; } },
      { name: 'spawnerSpawn', description: 'Spawner creates minion', play: () => this.playSpawnerSpawn() },
      { name: 'chainsawLoop', description: 'ZigZag chainsaw loop', play: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = this.startChainsawLoop() ?? undefined; }, stop: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = undefined; } },
      { name: 'drillLoop', description: 'Stalker drill loop', play: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = this.startDrillLoop() ?? undefined; }, stop: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = undefined; } },
      { name: 'circularSawLoop', description: 'Speed circular saw loop', play: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = this.startCircularSawLoop() ?? undefined; }, stop: () => { this._catalogueStopLoop?.(); this._catalogueStopLoop = undefined; } },

      { name: 'startScreenMusic', description: 'Start screen theme (loop)', play: () => this.playStartScreenMusic(), stop: () => this.stopMusic() },
      { name: 'gameplayMusic', description: 'Background theme (loop)', play: () => this.playGameplayMusic(), stop: () => this.stopMusic() },
      { name: 'gameOver', description: 'Transition to game-over screen', play: () => this.playGameOver(), stop: () => this.stopGameOver() },
    ];
  }
}
