import { FONT_DEFAULT } from './FontLoader';

const KEY_SIZE = 34;
const KEY_GAP = 3;
const KEY_RADIUS = 5;
const PRESS_DURATION = 0.15;
const PRESS_DEPTH = 4;

const BG_IDLE = 'rgba(48, 40, 20, 0.85)';
const BG_PRESS = 'rgba(184, 134, 11, 0.95)';
const BORDER_IDLE = 'rgba(184, 134, 11, 0.35)';
const BORDER_PRESS = 'rgba(255, 220, 80, 0.9)';
const TEXT_IDLE = 'rgba(240, 230, 200, 0.7)';
const TEXT_PRESS = '#fff8e0';

const ROWS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

const ROW_OFFSETS = [0, 0.5, 1.25];

export class KeyPressDisplay {
  private pressTimers: Map<string, number> = new Map();

  pressKey(letter: string): void {
    this.pressTimers.set(letter.toLowerCase(), PRESS_DURATION);
  }

  pressSpace(): void {
    this.pressTimers.set('space', PRESS_DURATION);
  }

  update(deltaTime: number): void {
    for (const [key, timer] of this.pressTimers) {
      const next = timer - deltaTime;
      if (next <= 0) {
        this.pressTimers.delete(key);
      } else {
        this.pressTimers.set(key, next);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const centerX = ctx.canvas.width / 2;
    const baseY = ctx.canvas.height / 2 + 90;
    const step = KEY_SIZE + KEY_GAP;

    const topRowWidth = ROWS[0].length * step - KEY_GAP;

    ctx.save();

    for (let r = 0; r < ROWS.length; r++) {
      const row = ROWS[r];
      const rowWidth = row.length * step - KEY_GAP;
      const offsetX = ROW_OFFSETS[r] * step;
      const startX = centerX - topRowWidth / 2 + offsetX;
      const rowY = baseY + r * step;

      for (let c = 0; c < row.length; c++) {
        const letter = row[c];
        const x = startX + c * step;
        this.renderKey(ctx, x, rowY, KEY_SIZE, KEY_SIZE, letter.toUpperCase(), letter);
      }
    }

    const spaceY = baseY + ROWS.length * step;
    const spaceWidth = 7 * step - KEY_GAP;
    const spaceX = centerX - spaceWidth / 2;
    this.renderKey(ctx, spaceX, spaceY, spaceWidth, KEY_SIZE, 'SPACE', 'space');

    ctx.restore();
  }

  private renderKey(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    label: string,
    id: string
  ): void {
    const timer = this.pressTimers.get(id) ?? 0;
    const pressing = timer > 0;
    const t = pressing ? timer / PRESS_DURATION : 0;
    const depth = pressing ? PRESS_DEPTH * t : 0;
    const ky = y + depth;

    const bg = pressing ? BG_PRESS : BG_IDLE;
    const border = pressing ? BORDER_PRESS : BORDER_IDLE;
    const textColor = pressing ? TEXT_PRESS : TEXT_IDLE;

    if (pressing) {
      ctx.shadowColor = 'rgba(184, 134, 11, 0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, ky, w, h, KEY_RADIUS);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const fontSize = label.length > 1 ? 11 : 14;
    ctx.font = `bold ${fontSize}px "${FONT_DEFAULT}", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(label, x + w / 2, ky + h / 2);
  }
}
