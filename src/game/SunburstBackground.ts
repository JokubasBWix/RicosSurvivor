export interface SunburstConfig {
  rayCount: number;
  primaryColor: string;
  secondaryColor: string;
  softness: number;
  rotationSpeed: number;
  vignetteStrength: number;
}

const DEFAULT_CONFIG: SunburstConfig = {
  rayCount: 12,
  primaryColor: '#f2f2f2',
  secondaryColor: '#e0e0e0',
  softness: 0.3,
  rotationSpeed: 0.2,
  vignetteStrength: 0.2,
};

export class SunburstBackground {
  private config: SunburstConfig;
  private grainCanvas: HTMLCanvasElement;
  private grainPattern: CanvasPattern | null = null;
  private rotation: number = 0;

  constructor(config: Partial<SunburstConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.grainCanvas = document.createElement('canvas');
    this.generateGrain();
  }

  private generateGrain(): void {
    const size = 256;
    this.grainCanvas.width = size;
    this.grainCanvas.height = size;
    const ctx = this.grainCanvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 210 + Math.random() * 45;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  update(dt: number, wave: number = 1): void {
    this.rotation += this.config.rotationSpeed * wave * dt;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.hypot(cx, cy);

    const drawSize = radius * Math.SQRT2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.buildConicGradient(ctx);
    ctx.fillRect(-drawSize, -drawSize, drawSize * 2, drawSize * 2);
    ctx.restore();

    if (!this.grainPattern) {
      this.grainPattern = ctx.createPattern(this.grainCanvas, 'repeat');
    }
    if (this.grainPattern) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.grainPattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const vig = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.55, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${this.config.vignetteStrength})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  private buildConicGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
    const { rayCount, primaryColor, secondaryColor, softness } = this.config;
    const gradient = ctx.createConicGradient(0, 0, 0);
    const seg = 1 / rayCount;
    const halfSoft = Math.min(softness * seg * 0.5, seg * 0.499);

    const color = (i: number) => i % 2 === 0 ? primaryColor : secondaryColor;

    gradient.addColorStop(0, color(0));

    for (let k = 1; k < rayCount; k++) {
      const t = k * seg;
      gradient.addColorStop(t - halfSoft, color(k - 1));
      gradient.addColorStop(t + halfSoft, color(k));
    }

    gradient.addColorStop(1 - halfSoft, color(rayCount - 1));
    gradient.addColorStop(1, color(0));

    return gradient;
  }
}
