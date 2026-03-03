// Pure Web Audio API synthesis functions — one per sound effect.
// Each function receives an AudioContext and a destination (GainNode for master volume)
// and creates fire-and-forget nodes that GC automatically.

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
  nGain.gain.setValueAtTime(0.15, now);
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
  oGain.gain.setValueAtTime(0.08, now);
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
  nGain.gain.setValueAtTime(0.2, now);
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
  subGain.gain.setValueAtTime(0.25, now);
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
  sawGain.gain.setValueAtTime(0.1, now);
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

// ── 8. Game over ────────────────────────────────────────────────────
export function playGameOver(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Somber descending minor chord — two detuned sines
  const freqs = [440, 523.25]; // A4, C5 (minor third)
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 1.5);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 1.5);
  }
}

// ── 9. Sniper shoots ────────────────────────────────────────────────
export function playSniperShoot(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Bandpass noise "crack"
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(3000, now);
  bp.Q.setValueAtTime(5, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.12, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  noise.connect(bp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.04);

  // Square pulse
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1000, now);
  oGain.gain.setValueAtTime(0.06, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(oGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.04);
}

// ── 10. Tank spin start ─────────────────────────────────────────────
export function playTankSpin(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;
  const dur = 2.5;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + dur);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.linearRampToValueAtTime(0.1, now + dur * 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + dur);
}

// ── 11. Tank dash ───────────────────────────────────────────────────
export function playTankDash(ctx: Ctx, dest: Dest): void {
  const now = ctx.currentTime;

  // Bandpass noise "whoosh"
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1000, now);
  bp.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  bp.Q.setValueAtTime(1, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.15, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(bp).connect(nGain).connect(dest);
  noise.start(now);
  noise.stop(now + 0.3);

  // Descending sine
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
  oGain.gain.setValueAtTime(0.1, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(oGain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.3);
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

