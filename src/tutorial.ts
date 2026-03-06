import { TutorialGame } from './game/TutorialGame';
import { TutorialAction } from './game/TutorialScenario';
import { loadFonts } from './game/FontLoader';

const TYPING_DELAY = 0.3;

const scenario: TutorialAction[] = [
  // Spawn 3 nails: 2 far (nail, tack), 1 close (spike)
  { type: 'spawn', enemyType: 'nail', word: 'nail', offset: { x: 120, y: -250 }, speed: 30 },
  { type: 'spawn', enemyType: 'nail', word: 'tack', offset: { x: 200, y: -220 }, speed: 30 },
  { type: 'spawn', enemyType: 'nail', word: 'spike', offset: { x: -200, y: 0 }, speed: 25 },
  { type: 'wait', duration: 0.8 },

  // Type and finish "nail"
  { type: 'lock', targetWord: 'nail' },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'waitDestroyed', word: 'nail' },
  { type: 'wait', duration: 0.4 },

  // Start typing "tack" but only type "ta"
  { type: 'lock', targetWord: 'tack' },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'wait', duration: 0.3 },

  // Space reset — switch to closer enemy
  { type: 'space' },
  { type: 'wait', duration: 0.3 },

  // Type and finish "spike"
  { type: 'lock', targetWord: 'spike' },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'waitDestroyed', word: 'spike' },
  { type: 'wait', duration: 0.3 },

  //Type and finish "tack"
  { type: 'lock', targetWord: 'tack' },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'typeLetter', delay: TYPING_DELAY },
  { type: 'waitDestroyed', word: 'tack' },
  { type: 'wait', duration: 1.0 },
];

window.addEventListener('DOMContentLoaded', async () => {
  await loadFonts();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const params = new URLSearchParams(window.location.search);
  const embed = params.has('embed');

  const game = new TutorialGame(canvas, [scenario], { muted: embed });
  game.start();
});
