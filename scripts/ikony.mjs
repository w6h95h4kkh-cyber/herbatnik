// Renderuje ikony PNG z app/icons/icon.svg (jednorazowo, przy zmianie ikony).
// Użycie: NODE_PATH=$(npm root -g) node scripts/ikony.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../app/icons/icon.svg', import.meta.url), 'utf8');
const przegladarka = await chromium.launch();
const strona = await przegladarka.newPage();
async function renderuj(rozmiar, plik, maskowalna = false) {
  await strona.setViewportSize({ width: rozmiar, height: rozmiar });
  const wnetrze = maskowalna
    ? `<div style="width:100%;height:100%;background:#fdf6ec;display:grid;place-items:center"><div style="width:78%;height:78%">${svg}</div></div>`
    : svg;
  await strona.setContent(`<style>html,body{margin:0;background:transparent}svg{width:100%;height:100%;display:block}</style>${wnetrze}`);
  await strona.screenshot({ path: new URL(`../app/icons/${plik}`, import.meta.url).pathname, omitBackground: !maskowalna });
}
await renderuj(192, 'icon-192.png');
await renderuj(512, 'icon-512.png');
await renderuj(512, 'icon-maskable-512.png', true);
await renderuj(180, 'apple-touch-icon.png', true);
await przegladarka.close();
