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
// Seed: 72 herbaty Mariage Frères; typ/opis tylko tam, gdzie są w pliku
await s.waitForFunction(() => document.querySelectorAll('#lista-herbat .pozycja').length === 72);
await zrzut('1-seed');
await s.click('#lista-herbat .pozycja:has-text("Fuji-Yama")');
assert.equal(await s.getAttribute('.pola a', 'href'), 'https://steepster.com/teas/mariage-freres/12398-fuji-yama');
assert.match(await s.textContent('.typ-herbaty'), /zielona/);
assert.match(await s.textContent('.opis-producenta'), /Green tea, a precious gift from Japan/);
assert.match(await s.textContent('.pola'), /Wg producenta\s*100g ~ about 40 cups/);
assert.equal(await s.locator('.statusy .chip.wybrany').count(), 0);
await zrzut('1b-karta-seed');
await s.goto(URL_APP + '#/kolekcja');
await s.click('#lista-herbat .pozycja:has-text("Anis")');
assert.equal(await s.locator('.typ-herbaty').count(), 0); // brak w katalogu → puste, bez zgadywania
assert.equal(await s.locator('.opis-producenta').count(), 0);
await s.goto(URL_APP + '#/kolekcja');

// Dodaj herbatę
await s.click('.fab');
await s.fill('input[name=nazwa]', 'Mój Blend');
await s.fill('input[name=marka]', 'Mariage Frères');
await s.click('label.chip:has-text("czarna")');
await s.fill('input[name=pochodzenie]', 'Chiny');
await s.fill('input[name=aromaty]', 'owoce, kwiaty');
await s.fill('input[name=kubki]', '2–3');
await zrzut('2-formularz');
await s.click('button[type=submit]');
await s.waitForSelector('.nazwa-herbaty:has-text("Mój Blend")');

// Autouzupełnianie z katalogu: jednoznaczna nazwa → typ + opis + porcja
await s.goto(URL_APP + '#/herbata/nowa');
await s.waitForFunction(() => document.querySelectorAll('#katalog-nazw option').length > 600);
await s.fill('input[name=nazwa]', '88th night tea');
assert.equal(await s.inputValue('input[name=marka]'), 'Mariage Frères');
assert.equal(await s.inputValue('input[name=typ]:checked'), 'zielona');
assert.equal(await s.inputValue('textarea[name=opis]'), 'Grand cru green tea from Japan');
// Kilka produktów pod jedną nazwą → wybór wariantu, nic nie zgadujemy
await s.goto(URL_APP + '#/kolekcja');
await s.goto(URL_APP + '#/herbata/nowa');
await s.fill('input[name=nazwa]', 'Bel Ami');
assert.equal(await s.locator('input[name=typ]:checked').count(), 0);
assert.equal(await s.locator('[data-akcja=wariant-katalogu]').count(), 3);
await zrzut('2b-warianty');
await s.click('[data-akcja=wariant-katalogu]:has-text("Rooibos")');
assert.equal(await s.inputValue('input[name=typ]:checked'), 'ziolowa');
assert.equal(await s.inputValue('textarea[name=opis]'), 'Red tea Rooibos');
await s.goto(URL_APP + '#/kolekcja');

// Warianty z importu: wybór opisu w karcie (typ i porcja z katalogu, tylko gdy puste)
await s.click('#lista-herbat .pozycja:has-text("Elixir d\'Amour")');
await s.waitForSelector('.wybor-wariantu');
assert.equal(await s.locator('[data-akcja=wybierz-wariant]').count(), 2);
await zrzut('2d-wariant-karta');
await s.click('[data-akcja=wybierz-wariant]:has-text("Blue tea")');
await s.waitForSelector('.opis-producenta');
assert.match(await s.textContent('.opis-producenta'), /Blue tea, citrus note & rose/);
assert.match(await s.textContent('.typ-herbaty'), /oolong/);
assert.equal(await s.locator('[data-akcja=wybierz-wariant]').count(), 0);
await s.goto(URL_APP + '#/kolekcja');

// Katalog → „chcę kupić”
await s.click('[data-akcja=filtr-status][data-k=chce]');
await s.click('.wejscie-katalog');
await s.fill('#szukaj-katalog', 'bel ami');
assert.equal(await s.locator('.katalog-pozycja').count(), 3);
await s.click('.katalog-pozycja:has-text("Scented Blue Tea") [data-akcja=dodaj-z-katalogu]');
await s.waitForSelector('.katalog-pozycja:has-text("Scented Blue Tea") .w-kolekcji');
assert.equal(await s.locator('[data-akcja=dodaj-z-katalogu]').count(), 2); // pozostałe warianty nadal do dodania
await s.fill('#szukaj-katalog', 'fuji-yama');
assert.equal(await s.locator('.katalog-pozycja .w-kolekcji').count(), 1); // już w kolekcji z seeda
await zrzut('2c-katalog');
await s.goto(URL_APP + '#/kolekcja');
await s.click('[data-akcja=filtr-status][data-k=chce]');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 1);
await s.click('[data-akcja=filtr-status][data-k=wszystkie]');
await s.goto(URL_APP + '#/kolekcja');
await s.click('#lista-herbat .pozycja:has-text("Mój Blend")');
await s.waitForSelector('.nazwa-herbaty:has-text("Mój Blend")');

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
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 75);
await s.click('[data-akcja=filtr-typ][data-k=zielona]');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 9);
await s.click('[data-akcja=filtr-typ][data-k=wszystkie]');
await s.fill('#szukaj', 'kwiaty');
assert.equal(await s.locator('#lista-herbat .pozycja').count(), 1);
await s.fill('#szukaj', '');
await zrzut('5-kolekcja');

// Status z karty
await s.click('#lista-herbat .pozycja:has-text("Mój Blend")');
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
assert.match(await s2.textContent('.liczby-male'), /72 herbat · 0 degustacji/);
await s2.setInputFiles('#plik-importu', sciezka);
s2.on('pageerror', e => bledy.push(e.message));
await s2.waitForFunction(() => /75 herbat · 2 degustacji/.test(document.querySelector('.liczby-male')?.textContent));

// Offline: po odświeżeniu bez sieci aplikacja nadal działa
await s2.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready);
await s2.reload();
await s2.evaluate(() => navigator.serviceWorker.ready);
await kontekst.setOffline(true);
await s2.goto(URL_APP + '#/kolekcja');
await s2.reload();
await s2.waitForSelector('#lista-herbat .pozycja');
assert.equal(await s2.locator('#lista-herbat .pozycja').count(), 75);
await kontekst.setOffline(false);

// Usunięta herbata startowa nie wraca po ponownym uruchomieniu
await s2.click('#lista-herbat .pozycja:has-text("Apollon")');
await s2.click('[data-akcja=usun-herbate]');
await s2.waitForSelector('#lista-herbat .pozycja');
await s2.reload();
await s2.waitForSelector('#lista-herbat .pozycja');
await s2.waitForTimeout(500);
assert.equal(await s2.locator('#lista-herbat .pozycja').count(), 74);

// Aktualizacja z 0.2.0: baza z 36 herbatami startowymi i edycjami Misi
const k3 = await przegladarka.newContext({ ...devices['Pixel 7'] });
const s3 = await k3.newPage();
s3.on('pageerror', e => bledy.push(e.message));
await s3.goto(URL_APP + 'manifest.webmanifest');
await s3.evaluate(() => new Promise((ok, blad) => {
  const req = indexedDB.open('herbatnik', 2);
  req.onupgradeneeded = () => {
    const d = req.result;
    d.createObjectStore('herbaty', { keyPath: 'id' });
    d.createObjectStore('degustacje', { keyPath: 'id' }).createIndex('herbataId', 'herbataId');
    d.createObjectStore('meta', { keyPath: 'klucz' });
  };
  req.onsuccess = () => {
    const tx = req.result.transaction(['herbaty', 'meta'], 'readwrite');
    const h = (id, nazwa, pola = {}) => ({ id, nazwa, marka: 'Mariage Frères', typ: '', pochodzenie: '', aromaty: [], kubki: '', status: '', link: '', ...pola });
    tx.objectStore('herbaty').put(h('seed-mariage-freres-fuji-yama', 'Fuji-Yama', { kubki: '2', status: 'mam' }));
    tx.objectStore('herbaty').put(h('seed-mariage-freres-eros', 'Eros', { typ: 'oolong', aromaty: ['róża'] }));
    tx.objectStore('meta').put({ klucz: 'zestawy', wczytane: ['import-mariage-freres'] });
    tx.oncomplete = () => { req.result.close(); ok(); };
    tx.onerror = () => blad(tx.error);
  };
}));
await s3.goto(URL_APP + '#/herbata/seed-mariage-freres-fuji-yama');
await s3.waitForSelector('.opis-producenta');
assert.match(await s3.textContent('.typ-herbaty'), /zielona/); // puste → uzupełnione
assert.match(await s3.textContent('.pola'), /2\s*kubki/); // edycja zostaje
assert.equal(await s3.textContent('.statusy .chip.wybrany'), 'mam');
await s3.goto(URL_APP + '#/herbata/seed-mariage-freres-eros');
await s3.waitForSelector('.nazwa-herbaty');
assert.match(await s3.textContent('.typ-herbaty'), /oolong/); // typ Misi nie nadpisany (seed: czarna)
assert.match(await s3.textContent('.opis-producenta'), /Flowery black tea/);
// Misia czyści opis → po ponownym uruchomieniu nie wraca
await s3.click('text=Edytuj');
await s3.fill('textarea[name=opis]', '');
await s3.click('button[type=submit]');
await s3.waitForSelector('.nazwa-herbaty');
await s3.reload();
await s3.waitForSelector('.nazwa-herbaty');
await s3.waitForTimeout(300);
assert.equal(await s3.locator('.opis-producenta').count(), 0);
await s3.goto(URL_APP + '#/kolekcja');
await s3.waitForSelector('#lista-herbat .pozycja');
assert.equal(await s3.locator('#lista-herbat .pozycja').count(), 72);
await k3.close();

assert.deepEqual(bledy, []);
await przegladarka.close();
console.log('OK — wszystkie scenariusze przeszły');
