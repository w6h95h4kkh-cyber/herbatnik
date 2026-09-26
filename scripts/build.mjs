// Build danych aplikacji: dane/import-*.json → app/data/seed.json (herbaty startowe KOLEKCJI).
// Użycie: node scripts/build.mjs   (uruchamiany też w workflow GitHub Pages)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const TYPY = ['czarna', 'zielona', 'zolta', 'oolong', 'biala', 'ciemna', 'ziolowa'];
const STATUSY = ['mam', 'wypita', 'chce'];
const katalog = new URL('../dane/', import.meta.url);
const tekst = v => (typeof v === 'string' ? v.trim() : '');

export function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Pola null/puste zostają puste — nie zgadujemy typów ani nut.
export function herbataZImportu(h) {
  const nazwa = tekst(h.nazwa);
  const marka = tekst(h.marka);
  return {
    id: `seed-${slug(`${marka} ${nazwa}`)}`,
    nazwa,
    marka,
    typ: TYPY.includes(h.typ) ? h.typ : '',
    pochodzenie: tekst(h.pochodzenie),
    aromaty: Array.isArray(h.aromaty) ? h.aromaty.map(tekst).filter(Boolean) : [],
    kubki: tekst(h.kubki_z_porcji ?? h.kubki),
    status: STATUSY.includes(h.status) ? h.status : '',
    link: /^https?:\/\//.test(tekst(h.zrodlo ?? h.link)) ? tekst(h.zrodlo ?? h.link) : '',
  };
}

const zestawy = readdirSync(katalog).filter(f => /^import-.*\.json$/.test(f)).sort().map(plik => {
  const dane = JSON.parse(readFileSync(new URL(plik, katalog), 'utf8'));
  const herbaty = dane.herbaty.map(herbataZImportu).filter(h => h.nazwa);
  const ids = herbaty.map(h => h.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) throw new Error(`${plik}: powtórzone herbaty: ${dup.join(', ')}`);
  return { id: plik.replace(/\.json$/, ''), herbaty };
});

mkdirSync(new URL('../app/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../app/data/seed.json', import.meta.url), JSON.stringify({ zestawy }, null, 1) + '\n');
console.log(`seed.json: ${zestawy.map(z => `${z.id} (${z.herbaty.length})`).join(', ')}`);
