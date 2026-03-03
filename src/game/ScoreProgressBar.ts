import { LeaderboardEntry } from './Leaderboard';
import { FONT_DEFAULT } from './FontLoader';

const BAR_HEIGHT = 24;
const BAR_BOTTOM_OFFSET = 0;
const FILL_LERP_SPEED = 8;
const GRADIENT_SPEED = 0.6;
const MIN_BAR_MAX = 10;

interface Checkpoint {
  rank: number;
  name: string;
  score: number;
  tiedCount: number;
  kind: 'next' | 'top' | 'other';
}

interface LabelInfo {
  cp: Checkpoint;
  tickX: number;
  text: string;
  textW: number;
  pillW: number;
  pillLeft: number;
  pillRight: number;
  pillTop: number;
  pillBottom: number;
}

/** Returns [text color, border/tick color, pill bg color] for a checkpoint */
function checkpointColors(cp: Checkpoint): [string, string, string] {
  if (cp.kind === 'next') {
    return ['rgba(200, 200, 200, 0.85)', 'rgba(150, 150, 150, 0.45)', 'rgba(0, 0, 0, 0.7)'];
  }
  switch (cp.rank) {
    case 1: return ['#FFD700', 'rgba(255, 215, 0, 0.7)', 'rgba(80, 60, 0, 0.85)'];    // gold
    case 2: return ['#C0C0C0', 'rgba(192, 192, 192, 0.7)', 'rgba(60, 60, 60, 0.85)'];  // silver
    case 3: return ['#CD7F32', 'rgba(205, 127, 50, 0.7)', 'rgba(60, 40, 15, 0.85)'];   // bronze
    default: return ['rgba(200, 200, 200, 0.85)', 'rgba(150, 150, 150, 0.45)', 'rgba(0, 0, 0, 0.7)'];
  }
}

export class ScoreProgressBar {
  private animTime: number = 0;
  private currentFill: number = 0;

  update(deltaTime: number): void {
    this.animTime += deltaTime;
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    currentScore: number,
    entries: LeaderboardEntry[]
  ): void {
    const barX = 0;
    const barY = canvasHeight - BAR_BOTTOM_OFFSET - BAR_HEIGHT;
    const barWidth = canvasWidth;

    const topScore = entries.length > 0 ? entries[0].score : 0;
    const barMax = Math.max(MIN_BAR_MAX, topScore, currentScore) * 1.15;

    // Animate fill
    const fraction = Math.min(1, currentScore / barMax);
    const targetFill = fraction * barWidth;
    this.currentFill += (targetFill - this.currentFill) * Math.min(1, FILL_LERP_SPEED * (1 / 60));
    if (Math.abs(this.currentFill - targetFill) < 0.5) this.currentFill = targetFill;

    ctx.save();

    // Background track
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, BAR_HEIGHT, 0);
    ctx.fill();

    // Filled portion
    if (this.currentFill > 1) {
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(BAR_HEIGHT, this.currentFill), BAR_HEIGHT, 0);
      ctx.clip();

      const gradOffset = (this.animTime * GRADIENT_SPEED) % 1;
      const grad = ctx.createLinearGradient(
        barX - barWidth * gradOffset, barY,
        barX + barWidth * (1 - gradOffset), barY
      );
      const stops = ['#FFD700', '#FFA500', '#FFE066', '#DAA520', '#FFD700'];
      for (let i = 0; i < stops.length; i++) {
        grad.addColorStop(i / (stops.length - 1), stops[i]);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, this.currentFill, BAR_HEIGHT);
    }

    ctx.restore();

    // Draw current score number inside the filled bar, near the right edge
    if (currentScore > 0 && this.currentFill > 1) {
      const SCORE_FONT_SIZE = 14;
      ctx.save();
      ctx.font = `bold ${SCORE_FONT_SIZE}px "${FONT_DEFAULT}", monospace`;
      ctx.textBaseline = 'middle';

      const scoreText = `${currentScore}`;
      const scoreTextW = ctx.measureText(scoreText).width;
      const pad = 6;

      const scoreX = barX + this.currentFill - scoreTextW - pad;
      const scoreY = barY + BAR_HEIGHT / 2;

      // Black outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(scoreText, scoreX, scoreY);

      // White fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(scoreText, scoreX, scoreY);

      ctx.restore();
    }

    // Select and render checkpoints
    const checkpoints = this.selectCheckpoints(entries, currentScore);
    this.renderCheckpoints(ctx, barX, barY, barWidth, barMax, checkpoints);
  }

  /**
   * Picks the most relevant checkpoints to display:
   *  1. Deduplicate by score (keep highest rank, count ties)
   *  2. Only show scores the player hasn't surpassed yet
   *  3. Always include top 3 places (#1, #2, #3)
   *  4. Always include the next opponent to surpass
   */
  private selectCheckpoints(
    entries: LeaderboardEntry[],
    currentScore: number
  ): Checkpoint[] {
    if (entries.length === 0) return [];

    // Deduplicate by score
    const uniqueMap = new Map<number, { rank: number; name: string; count: number }>();
    for (let i = 0; i < entries.length; i++) {
      const s = entries[i].score;
      if (!uniqueMap.has(s)) {
        uniqueMap.set(s, { rank: i + 1, name: entries[i].name, count: 1 });
      } else {
        uniqueMap.get(s)!.count++;
      }
    }

    // Sorted descending by score
    const unique = Array.from(uniqueMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([score, info]) => ({
        rank: info.rank,
        name: info.name,
        score,
        tiedCount: info.count,
        kind: 'other' as Checkpoint['kind'],
      }));

    // Only scores the player hasn't surpassed
    const ahead = unique.filter(u => u.score > currentScore);
    if (ahead.length === 0) return [];

    const selected = new Map<number, Checkpoint>();

    // Top 3 places (if still ahead of player)
    for (const u of ahead) {
      if (u.rank <= 3 && !selected.has(u.score)) {
        selected.set(u.score, { ...u, kind: 'top' });
      }
    }

    // Next opponent to surpass (closest score above player)
    const next = ahead[ahead.length - 1];
    if (!selected.has(next.score)) {
      selected.set(next.score, { ...next, kind: 'next' });
    } else {
      selected.get(next.score)!.kind = 'next';
    }

    return Array.from(selected.values()).sort((a, b) => a.score - b.score);
  }

  private renderCheckpoints(
    ctx: CanvasRenderingContext2D,
    barX: number,
    barY: number,
    barWidth: number,
    barMax: number,
    checkpoints: Checkpoint[]
  ): void {
    if (checkpoints.length === 0) return;

    const FONT_SIZE = 14;
    const PILL_PAD_X = 6;
    const PILL_PAD_Y = 3;
    const PILL_RADIUS = 5;
    const PILL_GAP = 8;
    const PILL_SPACING = 6; // minimum gap between pills

    ctx.font = `bold ${FONT_SIZE}px "${FONT_DEFAULT}", monospace`;
    ctx.textBaseline = 'alphabetic';

    const pillH = FONT_SIZE + PILL_PAD_Y * 2;
    const pillY = barY - PILL_GAP - pillH;

    // Build label info for each checkpoint
    const labels: LabelInfo[] = [];

    for (const cp of checkpoints) {
      const tickX = barX + (cp.score / barMax) * barWidth;

      const text = `#${cp.rank} ${cp.name} ${cp.score}`;

      const textW = ctx.measureText(text).width;
      const pillW = textW + PILL_PAD_X * 2;

      // Initially center pill on tick
      let pillLeft = tickX - pillW / 2;
      pillLeft = Math.max(barX + 2, Math.min(pillLeft, barX + barWidth - pillW - 2));

      labels.push({
        cp,
        tickX,
        text,
        textW,
        pillW,
        pillLeft,
        pillRight: pillLeft + pillW,
        pillTop: pillY,
        pillBottom: pillY + pillH,
      });
    }

    // Spread pills apart so none overlap (greedy left-to-right pass)
    this.spreadLabels(labels, barX + 2, barX + barWidth - 2, PILL_SPACING);

    // --- Draw tick marks first (always visible) ---
    for (const lbl of labels) {
      const { cp, tickX } = lbl;
      const [, borderColor] = checkpointColors(cp);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tickX, barY);
      ctx.lineTo(tickX, barY + BAR_HEIGHT);
      ctx.stroke();
    }

    // --- Draw connecting lines + pills ---
    for (const lbl of labels) {
      const { cp, tickX } = lbl;
      const [textColor, borderColor, pillBg] = checkpointColors(cp);
      const pillCenterX = lbl.pillLeft + lbl.pillW / 2;

      // Connecting line from tick to pill center-bottom
      ctx.strokeStyle = borderColor.replace(/[\d.]+\)$/, '0.3)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tickX, barY);
      ctx.lineTo(pillCenterX, lbl.pillBottom);
      ctx.stroke();

      // Pill background
      ctx.fillStyle = pillBg;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(lbl.pillLeft, lbl.pillTop, lbl.pillW, lbl.pillBottom - lbl.pillTop, PILL_RADIUS);
      ctx.fill();
      ctx.stroke();

      // Pill text
      const textX = lbl.pillLeft + PILL_PAD_X;
      const textY = lbl.pillTop + PILL_PAD_Y + FONT_SIZE - 2;

      ctx.fillStyle = textColor;
      ctx.fillText(lbl.text, textX, textY);
    }
  }

  /**
   * Greedy left-to-right spread: pushes overlapping pills right,
   * then a right-to-left pass pushes back if they exceed bounds.
   * All labels always remain visible — none are dropped.
   */
  private spreadLabels(
    labels: LabelInfo[],
    minX: number,
    maxX: number,
    spacing: number
  ): void {
    if (labels.length <= 1) return;

    // Left-to-right: push right if overlapping
    for (let i = 1; i < labels.length; i++) {
      const prev = labels[i - 1];
      const curr = labels[i];
      const neededLeft = prev.pillRight + spacing;
      if (curr.pillLeft < neededLeft) {
        const shift = neededLeft - curr.pillLeft;
        curr.pillLeft += shift;
        curr.pillRight += shift;
      }
    }

    // Clamp last pill to maxX, then right-to-left push back
    const last = labels[labels.length - 1];
    if (last.pillRight > maxX) {
      const shift = last.pillRight - maxX;
      last.pillLeft -= shift;
      last.pillRight -= shift;
    }

    for (let i = labels.length - 2; i >= 0; i--) {
      const next = labels[i + 1];
      const curr = labels[i];
      const neededRight = next.pillLeft - spacing;
      if (curr.pillRight > neededRight) {
        const shift = curr.pillRight - neededRight;
        curr.pillLeft -= shift;
        curr.pillRight -= shift;
      }
    }

    // Clamp first pill to minX
    const first = labels[0];
    if (first.pillLeft < minX) {
      const shift = minX - first.pillLeft;
      first.pillLeft += shift;
      first.pillRight += shift;
    }
  }
}
