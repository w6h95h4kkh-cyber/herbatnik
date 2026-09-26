// Wspólne dla aplikacji i skryptu build (Node) — identyfikatory i typy herbat.

export const KLUCZE_TYPOW = ['czarna', 'zielona', 'zolta', 'oolong', 'biala', 'ciemna', 'ziolowa'];

// Typy zapisane w danych po polsku → klucze aplikacji. Rooibos, mate i napary owocowe nie są herbatą
// (Camellia sinensis), więc w 7-typowej klasyfikacji aplikacji trafiają do „ziołowej”.
// „mieszanka” (kilka typów herbaty naraz) nie pasuje do żadnego typu → zostaje pusta.
const ALIASY_TYPOW = {
  'biała': 'biala', 'żółta': 'zolta', 'ziołowa': 'ziolowa', 'ciemna/pu-erh': 'ciemna', 'pu-erh': 'ciemna',
  'rooibos': 'ziolowa', 'mate': 'ziolowa', 'owocowa': 'ziolowa',
};
export function kluczTypu(t) {
  if (typeof t !== 'string') return '';
  const k = t.trim().toLowerCase();
  return KLUCZE_TYPOW.includes(k) ? k : ALIASY_TYPOW[k] || '';
}

export function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Stały identyfikator herbaty z marki i nazwy — ta sama herbata z importu i z katalogu ma to samo id.
export const idHerbaty = (marka, nazwa) => `seed-${slug(`${marka} ${nazwa}`)}`;

// Porównywanie nazw bez wielkości liter i akcentów („FUJI-YAMA” = „Fuji-Yama”).
export const kluczNazwy = nazwa => slug(nazwa);
