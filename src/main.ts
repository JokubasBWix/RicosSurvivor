import { Game } from './game/Game';
import { loadFonts } from './game/FontLoader';

const WORDS = [
  'asteroid',
  'orbit',
  'laser',
  'galaxy',
  'meteor',
  'comet',
  'nebula',
  'plasma',
  'rocket',
  'stellar',
  'cosmic',
  'void',
  'pulsar',
  'quasar',
  'supernova'
];

window.addEventListener('DOMContentLoaded', async () => {
  await loadFonts();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const input = document.getElementById('input') as HTMLInputElement;

  if (!canvas || !input) {
    throw new Error('Required elements not found');
  }

  const game = new Game(canvas, input, WORDS);
  game.start();
});
