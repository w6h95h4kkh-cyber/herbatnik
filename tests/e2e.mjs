// Test end-to-end na emulowanym telefonie.
// Użycie: python3 -m http.server 8123 -d app &  NODE_PATH=$(npm root -g) node tests/e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const URL_APP = process.env.URL_APP || 'http://localhost:8123/';
const zrzuty = process.env.ZRZUTY; // katalog na zrzuty ekranu (opcjonalnie)
const przegladarka = await chromium.launch();
const kontekst = await przegladarka.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
const s = await kontekst.newPage();
const bledy = [];
s.on('pageerror', e => bledy.push(e.message));
s.on('dialog', d => d.accept());
const zrzut = async n => zrzuty && s.screenshot({ path: `${zrzuty}/${n}.png`, fullPage: true });

await s.goto(URL_APP);
await s.waitForSelector('.marka-app');
// Seed: 36 herbat Mariage Frères z pustymi polami i linkiem
await s.waitForFunction(() => document.querySelectorAll('#lista-herbat .pozycja').length === 36);
await zrzut('1-seed');
await s.click('#lista-herbat .pozycja:has-text("Cannelé")');
assert.equal(await s.getAttribute('.pola a', 'href'), 'https://steepster.com/teas/mariage-freres/39593-cannele-mariage-freres');
assert.equal(await s.locator('.typ-herbaty').count(), 0);
assert.equal(await s.locator('.statusy .chip.wybrany').count(), 0);
await zrzut('1b-karta-seed');
await s.goto(URL_APP + '#/kolekcja');

// Dodaj herbatę
await s.click('.fab');
await s.fill('input[name=nazwa]', 'Marco Polo');
await s.fill('input[name=marka]', 'Mariage Frères');
await s.click('label.chip:has-text("czarna")');
await s.fill('input[name=pochodzenie]', 'Chiny');
await s.fill('input[name=aromaty]', 'owoce, kwiaty');
await s.fill('input[name=kubki]', '2–3');
await zrzut('2-formularz');
await s.click('button[type=submit]');
await s.waitForSelector('.nazwa-herbaty:has-text("Marco Polo")');

// Degustacja w 3 tapnięciach: Degustuję → gwiazdka → Zapisz
await s.click('text=Degustuję');
await s.click('.gwiazda[data-o="4"]');
await zrzut('3-degustacja');
await s.click('button[type=submit]');
await s.waitForSelector('.karta-herbaty');
assert.equal(await s.locator('.degustacja').count(), 1);

// Druga herbata + degustacja z zakładki (tapnięcia: + → herbata → Zapisz)
await s.goto(URL_APP + '#/herbata/nowa');
await s.fill('input[name=nazwa]', 'Sencha Fuji');
await s.click('label.chip:has-text("zielona")');
await s.click('label.chip:has-text("zielona")'); // odznaczenie…
assert.equal(await s.locator('input[name=typ]:checked').count(), 0);
await s.click('label.chip:has-text("zielona")'); // …i ponowne zaznaczenie
await s.click('button[type=submit]');
await s.waitForSelector('.nazwa-herbaty:has-text("Sencha Fuji")');
await s.goto(URL_APP + '#/degustacje');
await s.click('.fab');
await s.click('[data-akcja=wybierz-herbate]:has-text("Sencha")');
await s.fill('input[name=temperatura]', '75');
await s.fill('input[name=czas]', '1:30');
await s.click('.gwiazda[data-o="5"]');
await s.fill('textarea[name=notatka]', 'trawiasta, słodka');
await s.click('button[type=submit]');
await s.waitForSelector('.statystyki');
assert.equal(await s.locator('.degustacja').count(), 2);
assert.match(await s.textContent('.statystyki'), /Najwyżej oceniane[\s\S]*Sencha Fuji/);
assert.match(await s.textContent('.lista'), /75°C · 1:30 min/);
await zrzut('4-degustacje');

// Temperatura i czas podpowiadane z ostatniego parzenia
await s.click('.fab');
await s.click('[data-akcja=wybierz-herbate]:has-text("Sencha")');
assert.equal(await s.inputValue('input[name=temperatura]'), '75');
assert.equal(await s.inputValue('input[name=czas]'), '1:30');
await s.goto(URL_APP + '#/kolekcja');

// Filtry i wyszukiwanie
await s.waitForSelector('#lista-herbat .pozycja');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 38);
await s.click('[data-akcja=filtr-typ][data-k=zielona]');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 1);
await s.click('[data-akcja=filtr-typ][data-k=wszystkie]');
await s.fill('#szukaj', 'kwiaty');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 1);
await s.fill('#szukaj', '');
await zrzut('5-kolekcja');

// Status z karty
await s.click('#lista-herbat .pozycja:has-text("Marco Polo")');
await s.click('[data-akcja=ustaw-status][data-k=wypita]');
await s.goto(URL_APP + '#/kolekcja');
await s.click('[data-akcja=filtr-status][data-k=wypita]');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 1);
await zrzut('5b-karta');

// Eksport → wyczyszczenie bazy → import
await s.goto(URL_APP + '#/kopia');
const [pobranie] = await Promise.all([s.waitForEvent('download'), s.click('[data-akcja=eksport]')]);
const sciezka = await pobranie.path();
await zrzut('6-kopia');
await s.evaluate(() => new Promise(r => { const req = indexedDB.deleteDatabase('herbatnik'); req.onsuccess = req.onblocked = r; }));
const s2 = await kontekst.newPage();
s2.on('dialog', d => d.accept());
await s2.goto(URL_APP + '#/kopia');
await s.close();
await s2.waitForSelector('.liczby-male');
assert.match(await s2.textContent('.liczby-male'), /36 herbat · 0 degustacji/);
await s2.setInputFiles('#plik-importu', sciezka);
s2.on('pageerror', e => bledy.push(e.message));
await s2.waitForFunction(() => /38 herbat · 2 degustacji/.test(document.querySelector('.liczby-male')?.textContent));

// Offline: po odświeżeniu bez sieci aplikacja nadal działa
await s2.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready);
await s2.reload();
await s2.evaluate(() => navigator.serviceWorker.ready);
await kontekst.setOffline(true);
await s2.goto(URL_APP + '#/kolekcja');
await s2.reload();
await s2.waitForSelector('#lista-herbat .pozycja');
assert.equal(await s2.locator('#lista-herbat .pozycja').count(), 38);
await kontekst.setOffline(false);

// Usunięta herbata startowa nie wraca po ponownym uruchomieniu
await s2.click('#lista-herbat .pozycja:has-text("Cannelé")');
await s2.click('[data-akcja=usun-herbate]');
await s2.waitForSelector('#lista-herbat .pozycja');
await s2.reload();
await s2.waitForSelector('#lista-herbat .pozycja');
await s2.waitForTimeout(500);
assert.equal(await s2.locator('#lista-herbat .pozycja').count(), 37);

assert.deepEqual(bledy, []);
await przegladarka.close();
console.log('OK — wszystkie scenariusze przeszły');
