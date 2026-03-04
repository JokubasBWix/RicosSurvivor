// Pure Web Audio API synthesis functions — one per sound effect.
// Each function receives an AudioContext and a destination (GainNode for master volume)
// and creates fire-and-forget nodes that GC automatically.

import sniperShootSrc from '../assets/audio/sniperShoot.mp3';
import chainsawSrc from '../assets/audio/chainsaw.mp3';
import drillSrc from '../assets/audio/drill.mp3';
import spinningAxeSrc from '../assets/audio/spinningAxe.mp3';
import circularSawSrc from '../assets/audio/circularSaw.mp3';
import gameOverSrc from '../assets/audio/gameOver.mp3';

type Ctx = AudioContext;
type Dest = AudioNode;

/** Reusable white-noise buffer (1 second, mono) */
let noiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: Ctx): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// ── 1. Correct letter typed ─────────────────────────────────────────
export function playCorrectLetter(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(1200, now + 0.04);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.06);
}

// ── 2. Wrong letter typed ───────────────────────────────────────────
export function playWrongLetter(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, now);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.08);
}

// ── 3. Projectile launched (leaf) ───────────────────────────────────
export function playShoot(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Filtered noise "thwack"
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2000, now);
  bp.Q.setValueAtTime(2, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.1, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  noise.connect(bp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.04);

  // Descending triangle
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
  oGain.gain.setValueAtTime(0.08, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(oGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.06);
}

// ── 4. Projectile impact ────────────────────────────────────────────
export function playImpact(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Metallic "ping"
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
  oGain.gain.setValueAtTime(0.12, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(oGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.1);

  // High-pass noise
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(4000, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.06, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noise.connect(hp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.08);
}

// ── 5. Enemy destroyed (normal) ─────────────────────────────────────
export function playEnemyDestroyed(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Noise "crunch"
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(800, now);
  bp.Q.setValueAtTime(1, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.3, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(bp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.12);

  // Descending sawtooth
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
  oGain.gain.setValueAtTime(0.16, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(oGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.15);
}

// ── 6. Enemy destroyed (sniper) — big explosion ─────────────────────
export function playBigExplosion(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Low-pass noise
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, now);
  lp.frequency.exponentialRampToValueAtTime(100, now + 0.4);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.4, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  noise.connect(lp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.4);

  // Sub-bass sine
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(60, now);
  sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
  subGain.gain.setValueAtTime(0.5, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  sub.connect(subGain).connect(dest);
  sub.start(now);
  sub.stop(now + 0.4);

  // Descending sawtooth
  const saw = ctx.createOscillator();
  const sawGain = ctx.createGain();
  saw.type = 'sawtooth';
  saw.frequency.setValueAtTime(200, now);
  saw.frequency.exponentialRampToValueAtTime(40, now + 0.3);
  sawGain.gain.setValueAtTime(0.2, now);
  sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  saw.connect(sawGain).connect(dest);
  saw.start(now);
  saw.stop(now + 0.3);
}

// ── 7. Player death ─────────────────────────────────────────────────
export function playPlayerDeath(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Heavy bass boom
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(80, now);
  bass.frequency.exponentialRampToValueAtTime(20, now + 0.6);
  bassGain.gain.setValueAtTime(0.3, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  bass.connect(bassGain).connect(dest);
  bass.start(now);
  bass.stop(now + 0.8);

  // Explosion noise
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(800, now);
  lp.frequency.exponentialRampToValueAtTime(80, now + 0.6);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.25, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.connect(lp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.6);

  // Descending failure tone
  const fail = ctx.createOscillator();
  const failGain = ctx.createGain();
  fail.type = 'sawtooth';
  fail.frequency.setValueAtTime(300, now + 0.1);
  fail.frequency.exponentialRampToValueAtTime(50, now + 0.8);
  failGain.gain.setValueAtTime(0, now);
  failGain.gain.linearRampToValueAtTime(0.1, now + 0.15);
  failGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  fail.connect(failGain).connect(dest);
  fail.start(now);
  fail.stop(now + 0.8);
}

// ── 8. Game over (sample-based) ──────────────────────────────────────
let gameOverBuffer: AudioBuffer | null = null;
fetch(gameOverSrc)
  .then((r) => r.arrayBuffer())
  .then((buf) => new AudioContext().decodeAudioData(buf))
  .then((decoded) => { gameOverBuffer = decoded; })
  .catch(() => {});

let activeGameOverSrc: AudioBufferSourceNode | null = null;
let activeGameOverGain: GainNode | null = null;

export function playGameOver(ctx: Ctx, dest: Dest): void {
  if (!gameOverBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = gameOverBuffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  src.connect(gain).connect(dest);
  activeGameOverSrc = src;
  activeGameOverGain = gain;
  src.start();
}

export function stopGameOver(): void {
  if (!activeGameOverGain) return;
  const g = activeGameOverGain;
  const s = activeGameOverSrc;
  g.gain.setValueAtTime(g.gain.value, g.context.currentTime);
  g.gain.linearRampToValueAtTime(0, g.context.currentTime + 0.5);
  activeGameOverSrc = null;
  activeGameOverGain = null;
  setTimeout(() => {
    try { s?.stop(); s?.disconnect(); } catch {}
  }, 550);
}

// ── 9. Sniper shoots (sample-based) ─────────────────────────────────
let sniperShootBuffer: AudioBuffer | null = null;
fetch(sniperShootSrc)
  .then((r) => r.arrayBuffer())
  .then((buf) => new AudioContext().decodeAudioData(buf))
  .then((decoded) => { sniperShootBuffer = decoded; })
  .catch(() => {});

export function playSniperShoot(ctx: Ctx, dest: Dest): void {
  if (!sniperShootBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = sniperShootBuffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.3;
  src.connect(gain).connect(dest);
  src.start();
}

// ── Looping sample helpers ───────────────────────────────────────────

let chainsawBuffer: AudioBuffer | null = null;
fetch(chainsawSrc)
  .then((r) => r.arrayBuffer())
  .then((buf) => new AudioContext().decodeAudioData(buf))
  .then((decoded) => { chainsawBuffer = decoded; })
  .catch(() => {});

let drillBuffer: AudioBuffer | null = null;
fetch(drillSrc)
  .then((r) => r.arrayBuffer())
  .then((buf) => new AudioContext().decodeAudioData(buf))
  .then((decoded) => { drillBuffer = decoded; })
  .catch(() => {});

function startSampleLoop(buffer: AudioBuffer | null, ctx: Ctx, dest: Dest, volume: number): (() => void) | null {
  if (!buffer) return null;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(dest);
  src.start();
  return () => { try { src.stop(); src.disconnect(); } catch {} };
}

export function startChainsawLoop(ctx: Ctx, dest: Dest): (() => void) | null {
  return startSampleLoop(chainsawBuffer, ctx, dest, 0.7);
}

export function startDrillLoop(ctx: Ctx, dest: Dest): (() => void) | null {
  return startSampleLoop(drillBuffer, ctx, dest, 0.8);
}

// ── 10. Tank spin loop ──────────────────────────────────────────────
let spinningAxeBuffer: AudioBuffer | null = null;
fetch(spinningAxeSrc)
  .then((r) => r.arrayBuffer())
  .then((buf) => new AudioContext().decodeAudioData(buf))
  .then((decoded) => { spinningAxeBuffer = decoded; })
  .catch(() => {});

export function startTankSpinLoop(ctx: Ctx, dest: Dest): (() => void) | null {
  return startSampleLoop(spinningAxeBuffer, ctx, dest, 1);
}

// ── 11. Circular saw loop (speed enemy) ─────────────────────────────
let circularSawBuffer: AudioBuffer | null = null;
fetch(circularSawSrc)
  .then((r) => r.arrayBuffer())
  .then((buf) => new AudioContext().decodeAudioData(buf))
  .then((decoded) => { circularSawBuffer = decoded; })
  .catch(() => {});

export function startCircularSawLoop(ctx: Ctx, dest: Dest): (() => void) | null {
  return startSampleLoop(circularSawBuffer, ctx, dest, 0.7);
}

// ── 12. Spawner spawns child ────────────────────────────────────────
export function playSpawnerSpawn(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Descending triangle "clunk"
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
  oGain.gain.setValueAtTime(0.12, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(oGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.08);

  // Noise burst
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.08, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noise.connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.05);
}

