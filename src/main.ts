import { Game } from './game/Game';
import { loadFonts } from './game/FontLoader';

const WORDS = [
  // ── Short words (≤5 chars) — used by speed enemies ──────────────
  // Programming basics
  'code', 'loop', 'node', 'rust', 'byte', 'data', 'hash',
  'port', 'push', 'pull', 'fork', 'heap', 'pipe', 'link',
  'font', 'bold', 'undo', 'redo', 'sort', 'tree', 'grid',
  'flex', 'hook', 'type', 'enum', 'void', 'lint', 'mock',
  'test', 'spec', 'diff', 'edit', 'view', 'curl', 'grep',
  'make', 'swap', 'lock', 'flag', 'char', 'seek', 'ping',
  'root', 'sudo', 'trim', 'span', 'slot', 'emit', 'bind',
  'prop', 'math', 'drop', 'load', 'save', 'copy', 'path',
  'blob', 'wasm', 'yaml', 'bash', 'unix', 'cron', 'args',
  'keys', 'refs', 'bits', 'tags', 'icon', 'memo', 'lazy',

  // ── Medium words (5-7 chars) — general enemies ──────────────────
  // Engineering & dev
  'stack', 'queue', 'graph', 'index', 'query', 'table',
  'panel', 'modal', 'badge', 'chart', 'image', 'pixel',
  'debug', 'error', 'async', 'await', 'yield', 'cache',
  'fetch', 'proxy', 'regex', 'class', 'token', 'build',
  'merge', 'patch', 'parse', 'route', 'scope', 'state',
  'store', 'event', 'frame', 'layer', 'scene', 'input',
  'block', 'chunk', 'fiber', 'trait', 'crate', 'macro',
  'tuple', 'union', 'alloc', 'float', 'shift', 'break',
  'match', 'catch', 'throw', 'super', 'final', 'draft',
  'embed', 'latex', 'quote', 'media', 'title', 'align',

  // Rich content & editor
  'cursor', 'plugin', 'widget', 'layout', 'render', 'canvas',
  'syntax', 'server', 'client', 'socket', 'thread', 'kernel',
  'binary', 'struct', 'method', 'return', 'github', 'branch',
  'rebase', 'commit', 'parser', 'router', 'schema', 'config',
  'stream', 'matrix', 'vector', 'tensor', 'shader', 'sprite',
  'header', 'footer', 'anchor', 'inline', 'italic', 'markup',
  'editor', 'prompt', 'output', 'format', 'encode', 'decode',
  'resize', 'scroll', 'toggle', 'select', 'button', 'slider',
  'avatar', 'border', 'shadow', 'margin', 'string', 'import',
  'export', 'module', 'buffer', 'docker', 'deploy', 'lambda',

  // ── Long words (≥6 chars) — used by tank enemies ────────────────
  // Core programming
  'compiler', 'function', 'variable', 'database', 'endpoint',
  'callback', 'iterator', 'protocol', 'template', 'platform',
  'abstract', 'dispatch', 'resolver', 'mutation', 'operator',
  'debugger', 'workflow', 'pipeline', 'terminal', 'overflow',
  'keyboard', 'software', 'hardware', 'firmware', 'assembly',
  'electron', 'typesafe', 'typeguard', 'nullable', 'readonly',
  'memoize', 'dispose', 'observe', 'subscribe', 'unsubscribe',

  // Architecture & infra
  'frontend', 'backend', 'fullstack', 'microchip', 'namespace',
  'container', 'decorator', 'construct', 'serialize', 'recursive',
  'interface', 'component', 'framework', 'exception', 'algorithm',
  'firewall', 'security', 'websocket', 'graphql', 'mongodb',
  'postgres', 'dynamodb', 'kubernetes', 'terraform', 'serverless',

  // Rich content & UI
  'dashboard', 'dropdown', 'carousel', 'checkbox', 'textarea',
  'markdown', 'richtext', 'renderer', 'engineer', 'gradient',
  'parallax', 'animation', 'viewport', 'stylesheet', 'responsive',
  'typography', 'typewriter', 'transform', 'translate', 'highlight',
  'paragraph', 'hyperlink', 'thumbnail', 'breadcrumb', 'accordion',
  'popover', 'tooltip', 'skeleton', 'divider', 'toolbar', 'snippet',
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
