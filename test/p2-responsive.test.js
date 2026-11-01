import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/style.css', 'utf8');
const html = readFileSync('index.html', 'utf8');

test('P2.4 includes mobile portrait, narrow-phone, and landscape layouts', () => {
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);
  assert.match(css, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)/);
});

test('P2.4 accounts for mobile safe areas and touch targets', () => {
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(html, /id="touch-controls"/);
});

test('P2.4 keeps creator, online, and modal panels scrollable on small screens', () => {
  assert.match(css, /\.creator-card\s*\{[^}]*overflow:\s*auto/s);
  assert.match(css, /\.online-card\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.modal-card\s*\{[^}]*overflow-y:\s*auto/s);
});
