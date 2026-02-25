export class ScreenShake {
  private intensity: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private decay: number = 12; // how fast shake dies out per second

  /** Trigger a new shake (intensities stack) */
  trigger(amount: number = 4): void {
    this.intensity += amount;
  }

  update(deltaTime: number): void {
    if (this.intensity > 0.1) {
      this.offsetX = (Math.random() * 2 - 1) * this.intensity;
      this.offsetY = (Math.random() * 2 - 1) * this.intensity;
      this.intensity *= Math.pow(0.001, deltaTime); // exponential falloff
    } else {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  /** Call before rendering game objects */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
  }

  /** Call after rendering game objects */
  restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  get isShaking(): boolean {
    return this.intensity > 0.1;
  }
}
