import { Game } from './game/Game';

// Word list
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

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const input = document.getElementById('input') as HTMLInputElement;

  if (!canvas || !input) {
    throw new Error('Required elements not found');
  }

  const game = new Game(canvas, input, WORDS);
  game.start();
});
