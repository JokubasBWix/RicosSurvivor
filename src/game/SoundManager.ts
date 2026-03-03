import * as SD from './SoundDesigns';
import { MusicManager } from './MusicManager';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted: boolean = false;
  private music: MusicManager = new MusicManager();

  /** Lazily create AudioContext on first use (satisfies browser autoplay policy) */
  private ensureContext(): { ctx: AudioContext; dest: GainNode } | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
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

  playCorrectLetter(): void {
    const a = this.ensureContext();
    if (a) SD.playCorrectLetter(a.ctx, a.dest);
  }

  playWrongLetter(): void {
    const a = this.ensureContext();
    if (a) SD.playWrongLetter(a.ctx, a.dest);
  }

  playShoot(): void {
    const a = this.ensureContext();
    if (a) SD.playShoot(a.ctx, a.dest);
  }

  playImpact(): void {
    const a = this.ensureContext();
    if (a) SD.playImpact(a.ctx, a.dest);
  }

  playEnemyDestroyed(): void {
    const a = this.ensureContext();
    if (a) SD.playEnemyDestroyed(a.ctx, a.dest);
  }

  playBigExplosion(): void {
    const a = this.ensureContext();
    if (a) SD.playBigExplosion(a.ctx, a.dest);
  }

  playPlayerDeath(): void {
    const a = this.ensureContext();
    if (a) SD.playPlayerDeath(a.ctx, a.dest);
  }

  playGameOver(): void {
    const a = this.ensureContext();
    if (a) SD.playGameOver(a.ctx, a.dest);
  }

  playSniperShoot(): void {
    const a = this.ensureContext();
    if (a) SD.playSniperShoot(a.ctx, a.dest);
  }

  playTankSpin(): void {
    const a = this.ensureContext();
    if (a) SD.playTankSpin(a.ctx, a.dest);
  }

  playTankDash(): void {
    const a = this.ensureContext();
    if (a) SD.playTankDash(a.ctx, a.dest);
  }

  playSpawnerSpawn(): void {
    const a = this.ensureContext();
    if (a) SD.playSpawnerSpawn(a.ctx, a.dest);
  }

  playGetReady(): void {
    const a = this.ensureContext();
    if (a) SD.playGetReady(a.ctx, a.dest);
  }

  // ── Music ───────────────────────────────────────────────────────────

  playGameplayMusic(): void {
    this.music.playGameplay();
  }

  playGameOverMusic(): void {
    this.music.playGameOver();
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
      { name: 'gameOver', description: 'Transition to game-over screen', play: () => this.playGameOver() },
      { name: 'sniperShoot', description: 'Sniper fires a bullet', play: () => this.playSniperShoot() },
      { name: 'tankSpin', description: 'Tank starts spinning', play: () => this.playTankSpin() },
      { name: 'tankDash', description: 'Tank dashes forward', play: () => this.playTankDash() },
      { name: 'spawnerSpawn', description: 'Spawner creates minion', play: () => this.playSpawnerSpawn() },
      { name: 'getReady', description: 'Game start / restart', play: () => this.playGetReady() },
      { name: 'gameplayMusic', description: 'Background theme (loop)', play: () => this.playGameplayMusic(), stop: () => this.stopMusic() },
      { name: 'gameOverMusic', description: 'Game-over music (no-op)', play: () => this.playGameOverMusic(), stop: () => this.stopMusic() },
    ];
  }
}
