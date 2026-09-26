// Build danych aplikacji (uruchamiany też w workflow GitHub Pages):
//   dane/import-*.json          → app/data/seed.json     (herbaty startowe KOLEKCJI)
//   dane/katalog-*.json         → app/data/katalog.json  (podpowiedzi i lista „chcę kupić”)
// Użycie: node scripts/build.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { kluczTypu, idHerbaty } from '../app/js/wspolne.js';

const STATUSY = ['mam', 'wypita', 'chce'];
const katalog = new URL('../dane/', import.meta.url);
const tekst = v => (typeof v === 'string' ? v.trim() : '');
const link = v => (/^https?:\/\//.test(tekst(v)) ? tekst(v) : '');
const pliki = wzor => readdirSync(katalog).filter(f => wzor.test(f)).sort();
const wczytaj = plik => JSON.parse(readFileSync(new URL(plik, katalog), 'utf8'));

function bezDuplikatow(plik, herbaty) {
  const ids = herbaty.map(h => h.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) throw new Error(`${plik}: powtórzone herbaty: ${dup.join(', ')}`);
  return herbaty;
}

// Pola null/puste zostają puste — nie zgadujemy typów ani nut.
export function herbataZImportu(h) {
  const nazwa = tekst(h.nazwa);
  const marka = tekst(h.marka);
  return {
    id: idHerbaty(marka, nazwa),
    nazwa,
    marka,
    typ: kluczTypu(h.typ),
    pochodzenie: tekst(h.pochodzenie),
    aromaty: Array.isArray(h.aromaty) ? h.aromaty.map(tekst).filter(Boolean) : [],
    kubki: tekst(h.kubki_z_porcji ?? h.kubki),
    status: STATUSY.includes(h.status) ? h.status : '',
    link: link(h.zrodlo ?? h.link),
    opis: tekst(h.opis_producenta ?? h.opis),
    porcjaProducenta: tekst(h.porcja_producent ?? h.porcja),
  };
}

const zestawy = pliki(/^import-.*\.json$/).map(plik => ({
  id: plik.replace(/\.json$/, ''),
  herbaty: bezDuplikatow(plik, wczytaj(plik).herbaty.map(herbataZImportu).filter(h => h.nazwa)),
}));

// Katalog sklepu miewa tę samą nazwę kilka razy. Identyczne wpisy („THÉ À L'OPÉRA” / „THÉ À L’OPÉRA”)
// scalamy — zostaje zapis z pełniejszą typografią. Różne produkty pod jedną nazwą (np. Bel Ami: oolong
// i rooibos) zostają jako warianty z id z przyrostkiem (-2, -3…); aplikacja pokaże je do wyboru.
function warianty(herbaty) {
  const typografia = n => (n.match(/[^\x00-\x7f]/g) || []).length;
  const tresc = h => JSON.stringify([h.opis, h.typ, h.porcjaProducenta]);
  const wynik = [];
  for (const h of herbaty) {
    const takiSam = wynik.find(x => x.id.replace(/-\d+$/, '') === h.id && tresc(x) === tresc(h));
    if (takiSam) {
      if (typografia(h.nazwa) > typografia(takiSam.nazwa)) takiSam.nazwa = h.nazwa;
      continue;
    }
    const ile = wynik.filter(x => x.id === h.id || x.id.startsWith(`${h.id}-`) && /^\d+$/.test(x.id.slice(h.id.length + 1))).length;
    wynik.push(ile ? { ...h, id: `${h.id}-${ile + 1}` } : h);
  }
  return wynik;
}

// Marka katalogu z nazwy pliku: katalog-mariage-freres.json → „Mariage Frères” (znane marki), inaczej z pola „marka”.
const MARKI = { 'mariage-freres': 'Mariage Frères', 'kusmi': 'Kusmi Tea', 'palais-des-thes': 'Palais des Thés' };
const katalogi = pliki(/^katalog-.*\.json$/).map(plik => {
  const dane = wczytaj(plik);
  const marka = tekst(dane.marka) || MARKI[plik.replace(/^katalog-|\.json$/g, '')] || '';
  const herbaty = dane.herbaty.map(h => ({
    id: idHerbaty(marka, tekst(h.nazwa)),
    nazwa: tekst(h.nazwa),
    marka,
    typ: kluczTypu(h.typ),
    opis: tekst(h.opis_producenta ?? h.opis),
    porcjaProducenta: tekst(h.porcja),
  })).filter(h => h.nazwa);
  return { id: plik.replace(/\.json$/, ''), marka, herbaty: bezDuplikatow(plik, warianty(herbaty)) };
});

const wyjscie = new URL('../app/data/', import.meta.url);
mkdirSync(wyjscie, { recursive: true });
writeFileSync(new URL('seed.json', wyjscie), JSON.stringify({ zestawy }, null, 1) + '\n');
writeFileSync(new URL('katalog.json', wyjscie), JSON.stringify({ katalogi }, null, 1) + '\n');
console.log(`seed.json: ${zestawy.map(z => `${z.id} (${z.herbaty.length})`).join(', ')}`);
console.log(`katalog.json: ${katalogi.map(k => `${k.id} (${k.herbaty.length})`).join(', ')}`);
