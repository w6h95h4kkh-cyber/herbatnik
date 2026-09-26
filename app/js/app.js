import * as db from './db.js';
import { kluczNazwy as kluczNazwyBezCache } from './wspolne.js';

// Klucze nazw liczone raz (katalog ma setki pozycji, porównujemy je często).
const kluczeNazw = new Map();
function kluczNazwy(nazwa) {
  if (!kluczeNazw.has(nazwa)) kluczeNazw.set(nazwa, kluczNazwyBezCache(nazwa));
  return kluczeNazw.get(nazwa);
}

// ---------- Słowniki ----------
export const TYPY = [
  { k: 'czarna', n: 'czarna', kolor: '#6e3b23' },
  { k: 'zielona', n: 'zielona', kolor: '#7f9a4a' },
  { k: 'zolta', n: 'żółta', kolor: '#d8b440' },
  { k: 'oolong', n: 'oolong', kolor: '#b27a3c' },
  { k: 'biala', n: 'biała', kolor: '#e9dcc0' },
  { k: 'ciemna', n: 'ciemna / pu-erh', kolor: '#43291d' },
  { k: 'ziolowa', n: 'ziołowa', kolor: '#9b6488' },
];
const STATUSY = [
  { k: 'mam', n: 'mam' },
  { k: 'wypita', n: 'wypita' },
  { k: 'chce', n: 'chcę kupić' },
];
const MARKI_START = ['Mariage Frères', 'Kusmi Tea', 'Palais des Thés'];

const typ = k => TYPY.find(t => t.k === k);
const status = k => STATUSY.find(s => s.k === k);

// ---------- Stan ----------
const stan = {
  herbaty: [],
  degustacje: [],
  filtr: { tekst: '', status: 'wszystkie', typ: 'wszystkie' },
  katalog: null, // herbaty z katalogów sklepów (data/katalog.json), wczytywane w tle
  filtrKatalogu: { tekst: '', typ: 'wszystkie' },
};
let nawigacjaWewnetrzna = false;

// ---------- Pomocnicze ----------
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const teraz = () => new Date().toISOString();

function dzisiaj() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtData(iso) {
  if (!iso) return '';
  const [r, m, d] = iso.split('-').map(Number);
  return new Date(r, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}
// „3” → 180 s, „2:30” → 150 s, „2,5” → 150 s
export function parsujCzas(txt) {
  const t = String(txt ?? '').trim().replace(',', '.');
  if (!t) return null;
  const m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(t.replace(/\s*(min|m)$/i, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 60) : null;
}
export function fmtCzas(s) {
  if (s == null) return '';
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}:${String(r).padStart(2, '0')}` : String(m);
}
// Tylko adresy http(s) — nic innego nie trafi do href.
export function bezpiecznyLink(txt) {
  const t = String(txt ?? '').trim();
  try { return /^https?:$/.test(new URL(t).protocol) ? t : ''; } catch { return ''; }
}
const gwiazdki = (o, klasa = '') =>
  o ? `<span class="gwiazdki ${klasa}" aria-label="ocena ${o} na 5">${'★'.repeat(o)}<span class="puste">${'★'.repeat(5 - o)}</span></span>` : '';
const srednia = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const fmtSr = x => (x == null ? '—' : x.toFixed(1).replace('.', ','));

const herbata = id => stan.herbaty.find(h => h.id === id);
const degustacjeHerbaty = id => stan.degustacje.filter(d => d.herbataId === id);
function sredniaOcena(id) {
  return srednia(degustacjeHerbaty(id).map(d => d.ocena).filter(Boolean));
}
function sortujDegustacje(arr) {
  return [...arr].sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.utworzono || '').localeCompare(a.utworzono || ''));
}

function toast(txt) {
  const el = $('#toast');
  el.textContent = txt;
  el.classList.add('widoczny');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('widoczny'), 1800);
}

function idzDo(hash, { zastap = false } = {}) {
  if (zastap) location.replace(hash);
  else location.hash = hash;
}
// Po zapisie formularza: wróć tam, skąd przyszłaś (albo do wskazanego miejsca).
function wroc(domyslnie) {
  if (nawigacjaWewnetrzna && history.length > 1) history.back();
  else idzDo(domyslnie, { zastap: true });
}

function kropkaTypu(k) {
  const t = typ(k);
  return t ? `<span class="kropka" style="--k:${t.kolor}"></span>` : '';
}

const ikony = {
  kolekcja: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z"/><path d="M5 19 13 11"/></svg>',
  degustacje: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V9Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H16.5"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/></svg>',
  kopia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v3H4zM5 10h14v9H5z"/><path d="M10 14h4"/></svg>',
};

// ---------- Widoki ----------
function naglowek(tytul, powrot) {
  return `<header class="gora">
    ${powrot ? `<a class="wstecz" href="${powrot}" data-akcja="wstecz" aria-label="Wstecz">‹</a>` : ''}
    <h1 class="${powrot ? 'podtytul' : 'marka-app'}">${esc(tytul)}</h1>
  </header>`;
}

function widokKolekcja() {
  const f = stan.filtr;
  const ile = k => (k === 'wszystkie' ? stan.herbaty.length : stan.herbaty.filter(h => h.status === k).length);
  return `${naglowek('Herbatnik')}
  <section class="narzedzia">
    <input type="search" id="szukaj" placeholder="Szukaj: nazwa, marka, aromat…" value="${esc(f.tekst)}" autocomplete="off">
    <div class="chipy" role="group" aria-label="Status">
      ${[{ k: 'wszystkie', n: 'wszystkie' }, ...STATUSY].map(s =>
        `<button class="chip ${f.status === s.k ? 'wybrany' : ''}" data-akcja="filtr-status" data-k="${s.k}">${s.n} <small>${ile(s.k)}</small></button>`).join('')}
    </div>
    <div class="chipy przewijane" role="group" aria-label="Typ">
      <button class="chip ${f.typ === 'wszystkie' ? 'wybrany' : ''}" data-akcja="filtr-typ" data-k="wszystkie">każdy typ</button>
      ${TYPY.map(t => `<button class="chip ${f.typ === t.k ? 'wybrany' : ''}" data-akcja="filtr-typ" data-k="${t.k}">${kropkaTypu(t.k)}${t.n}</button>`).join('')}
    </div>
  </section>
  <div id="lista-herbat"></div>
  <a class="fab" href="#/herbata/nowa" aria-label="Dodaj herbatę">+ herbata</a>`;
}

function listaHerbat() {
  if (!stan.herbaty.length) {
    return `<div class="pusto karta"><p>Kolekcja jest jeszcze pusta.</p>
      <p>Dodaj pierwszą herbatę przyciskiem <b>+ herbata</b> albo wczytaj kopię w zakładce <b>Kopia</b>.</p></div>`;
  }
  const f = stan.filtr;
  const q = f.tekst.trim().toLocaleLowerCase('pl');
  const pasuje = h =>
    (f.status === 'wszystkie' || h.status === f.status) &&
    (f.typ === 'wszystkie' || h.typ === f.typ) &&
    (!q || [h.nazwa, h.marka, h.pochodzenie, h.opis, ...(h.aromaty || [])].join(' ').toLocaleLowerCase('pl').includes(q));
  const lista = stan.herbaty.filter(pasuje);
  const doKatalogu = f.status === 'chce' && stan.katalog?.length
    ? `<a class="karta wejscie-katalog" href="#/katalog"><span>Wybierz z katalogu Mariage Frères</span><small>${stan.katalog.length} herbat ze sklepu z opisem producenta</small></a>` : '';
  if (!lista.length) return `${doKatalogu}<p class="pusto">Nic nie pasuje do filtrów.</p>`;

  const grupy = new Map();
  lista
    .sort((a, b) => (a.marka || '￿').localeCompare(b.marka || '￿', 'pl') || a.nazwa.localeCompare(b.nazwa, 'pl'))
    .forEach(h => {
      const m = h.marka || 'Bez marki';
      if (!grupy.has(m)) grupy.set(m, []);
      grupy.get(m).push(h);
    });
  return doKatalogu + [...grupy].map(([marka, hs]) => `
    <h2 class="grupa"><span>${esc(marka)}</span> <small>${hs.length}</small></h2>
    <ul class="lista">${hs.map(h => {
      const sr = sredniaOcena(h.id);
      return `<li><a class="karta pozycja" href="#/herbata/${h.id}">
        <span class="pozycja-nazwa">${esc(h.nazwa)}</span>
        <span class="pozycja-meta">${h.typ ? `${kropkaTypu(h.typ)}${typ(h.typ).n}` : ''}${h.aromaty?.length ? ` · <i>${esc(h.aromaty.join(', '))}</i>` : ''}</span>
        <span class="pozycja-dol">${sr ? gwiazdki(Math.round(sr), 'male') : ''}${h.status && h.status !== 'mam' ? `<span class="znacznik s-${h.status}">${status(h.status).n}</span>` : ''}</span>
      </a></li>`;
    }).join('')}</ul>`).join('');
}

function widokHerbata(id) {
  const h = herbata(id);
  if (!h) return `${naglowek('Nie ma takiej herbaty', '#/kolekcja')}<p class="pusto">Ta herbata nie istnieje (może została usunięta).</p>`;
  const deg = sortujDegustacje(degustacjeHerbaty(id));
  const sr = sredniaOcena(id);
  const pole = (etykieta, wartosc) => (wartosc ? `<dt>${etykieta}</dt><dd>${wartosc}</dd>` : '');
  return `${naglowek('Karta herbaty', '#/kolekcja')}
  <article class="karta karta-herbaty">
    <p class="ozdobnik">${h.marka ? esc(h.marka) : '&nbsp;'}</p>
    <h2 class="nazwa-herbaty">${esc(h.nazwa)}</h2>
    ${h.typ ? `<p class="typ-herbaty">${kropkaTypu(h.typ)}herbata ${typ(h.typ).n}</p>` : ''}
    ${!h.opis && h.warianty?.length ? `<div class="wybor-wariantu">
      <p>W katalogu ${esc(h.marka || 'sklepu')} ta nazwa ma ${h.warianty.length} ${h.warianty.length < 5 ? 'warianty' : 'wariantów'}. Który to?</p>
      ${h.warianty.map((w, i) => `<button class="chip" data-akcja="wybierz-wariant" data-id="${h.id}" data-i="${i}">${esc(opisWariantu(w))}</button>`).join('')}
    </div>` : ''}
    ${h.opis ? `<blockquote class="opis-producenta"><span>${esc(h.opis)}</span><small>opis producenta</small></blockquote>` : ''}
    ${sr ? `<p class="srednia">${gwiazdki(Math.round(sr))} <small>${fmtSr(sr)} · ${deg.filter(d => d.ocena).length} ocen</small></p>` : ''}
    <dl class="pola">
      ${pole('Pochodzenie', esc(h.pochodzenie))}
      ${pole('Aromaty', h.aromaty?.length ? `<i>${esc(h.aromaty.join(', '))}</i>` : '')}
      ${pole('Link', h.link ? `<a href="${esc(h.link)}" target="_blank" rel="noopener noreferrer">${esc(new URL(h.link).hostname.replace(/^www\./, ''))} ↗</a>` : '')}
      ${pole('Z jednej porcji', h.kubki ? `${esc(h.kubki)} ${/kub/i.test(h.kubki) ? '' : 'kubki'}` : '')}
      ${pole('Wg producenta', esc(h.porcjaProducenta))}
    </dl>
    <div class="chipy statusy" role="group" aria-label="Status">
      ${STATUSY.map(s => `<button class="chip ${h.status === s.k ? 'wybrany' : ''}" data-akcja="ustaw-status" data-id="${h.id}" data-k="${s.k}">${s.n}</button>`).join('')}
    </div>
  </article>
  <a class="przycisk glowny szeroki" href="#/degustacja/nowa?herbata=${h.id}">Degustuję</a>

  <h3 class="sekcja">Degustacje <small>${deg.length}</small></h3>
  ${deg.length ? `<ul class="lista">${deg.map(pozycjaDegustacji).join('')}</ul>` : '<p class="pusto">Jeszcze nie degustowana.</p>'}

  <div class="akcje-dol">
    <a class="przycisk" href="#/herbata/${h.id}/edytuj">Edytuj</a>
    <button class="przycisk ostrozny" data-akcja="usun-herbate" data-id="${h.id}">Usuń</button>
  </div>`;
}

function pozycjaDegustacji(d, zNazwa = false) {
  const h = herbata(d.herbataId);
  const parametry = [d.temperatura != null ? `${d.temperatura}°C` : '', d.czas != null ? `${fmtCzas(d.czas)} min` : ''].filter(Boolean).join(' · ');
  return `<li><a class="karta pozycja degustacja" href="#/degustacja/${d.id}">
    <span class="pozycja-gora"><span class="data">${fmtData(d.data)}</span>${gwiazdki(d.ocena, 'male')}</span>
    ${zNazwa ? `<span class="pozycja-nazwa">${h ? esc(h.nazwa) : '<i>usunięta herbata</i>'}</span>` : ''}
    ${parametry ? `<span class="pozycja-meta">${parametry}</span>` : ''}
    ${d.notatka ? `<span class="notatka">${esc(d.notatka)}</span>` : ''}
  </a></li>`;
}

function widokFormHerbaty(id) {
  const h = id ? herbata(id) : null;
  if (id && !h) return widokHerbata(id);
  const w = h || { status: 'mam' };
  const marki = [...new Set([...MARKI_START, ...stan.herbaty.map(x => x.marka).filter(Boolean)])];
  return `${naglowek(h ? 'Edytuj herbatę' : 'Nowa herbata', h ? `#/herbata/${h.id}` : '#/kolekcja')}
  <form id="form-herbata" class="formularz karta" data-id="${h ? h.id : ''}" autocomplete="off">
    <label>Nazwa<input name="nazwa" required list="katalog-nazw" value="${esc(w.nazwa)}" placeholder="np. Marco Polo"></label>
    <datalist id="katalog-nazw">${opcjeKatalogu()}</datalist>
    <p id="podpowiedz-katalogu" class="podpowiedz" hidden></p>
    <label>Marka<input name="marka" list="marki" value="${esc(w.marka)}"></label>
    <datalist id="marki">${marki.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
    <fieldset><legend>Typ</legend><div class="chipy">
      ${TYPY.map(t => `<label class="chip"><input type="radio" name="typ" value="${t.k}" ${w.typ === t.k ? 'checked' : ''}>${kropkaTypu(t.k)}${t.n}</label>`).join('')}
    </div></fieldset>
    <label>Pochodzenie<input name="pochodzenie" value="${esc(w.pochodzenie)}" placeholder="np. Chiny, Yunnan"></label>
    <label><span>Aromaty <small>(po przecinku)</small></span><input name="aromaty" value="${esc((w.aromaty || []).join(', '))}" placeholder="np. wanilia, owoce, kwiaty"></label>
    <label><span>Z jednej porcji <small>(ile kubków)</small></span><input name="kubki" value="${esc(w.kubki)}" placeholder="np. 2–3"></label>
    <label><span>Opis producenta</span><textarea name="opis" rows="2">${esc(w.opis)}</textarea></label>
    <label><span>Porcja wg producenta <small>(np. 100g ~ about 40 cups)</small></span><input name="porcjaProducenta" value="${esc(w.porcjaProducenta)}"></label>
    <label><span>Link <small>(np. Steepster)</small></span><input name="link" type="url" inputmode="url" value="${esc(w.link)}" placeholder="https://…"></label>
    <fieldset><legend>Status</legend><div class="chipy">
      ${STATUSY.map(s => `<label class="chip"><input type="radio" name="status" value="${s.k}" ${w.status === s.k ? 'checked' : ''}>${s.n}</label>`).join('')}
    </div></fieldset>
    <div class="przyklejone"><button class="przycisk glowny szeroki" type="submit">Zapisz</button></div>
  </form>`;
}

// ---------- Katalog sklepu ----------
function opcjeKatalogu() {
  return [...(stan.katalogWgNazwy?.values() || [])].map(([k, ...reszta]) => {
    const n = reszta.length + 1;
    return `<option value="${esc(k.nazwa)}">${esc(k.marka)}${n > 1 ? ` · ${n} ${n < 5 ? 'warianty' : 'wariantów'}` : ''}</option>`;
  }).join('');
}
const wariantyKatalogu = nazwa => stan.katalogWgNazwy?.get(kluczNazwy(nazwa)) || [];
// Herbata z katalogu jest „w kolekcji”, gdy ma to samo id albo — jeśli nazwa w katalogu jest jednoznaczna — tę samą nazwę.
const herbataWKolekcji = k => herbata(k.id) || (wariantyKatalogu(k.nazwa).length === 1
  ? stan.herbaty.find(h => kluczNazwy(h.nazwa) === kluczNazwy(k.nazwa) && (!h.marka || h.marka === k.marka)) : undefined);
const opisWariantu = k => `${k.typ ? `${typ(k.typ).n} · ` : ''}${k.opis || 'bez opisu'}`;

// Nazwa z katalogu → uzupełnij puste pola (marka, typ, opis, porcja). Niczego, co już wpisane, nie nadpisuje.
// Gdy pod tą nazwą jest kilka produktów, pokaż je do wyboru zamiast zgadywać.
function uzupelnijZKatalogu(form, wybrany) {
  const podpowiedz = $('#podpowiedz-katalogu');
  const warianty = wybrany ? [wybrany] : wariantyKatalogu(form.elements.nazwa.value);
  if (!warianty.length) { podpowiedz.hidden = true; return; }
  podpowiedz.hidden = false;
  if (warianty.length > 1) {
    const n = warianty.length;
    podpowiedz.innerHTML = `W katalogu ${esc(warianty[0].marka)} ta nazwa ma ${n} ${n < 5 ? 'warianty' : 'wariantów'} — który to?
      ${warianty.map(k => `<button type="button" class="chip" data-akcja="wariant-katalogu" data-id="${k.id}">${esc(opisWariantu(k))}</button>`).join('')}`;
    return;
  }
  const k = warianty[0];
  const uzupelnione = [];
  if (!form.elements.marka.value.trim()) { form.elements.marka.value = k.marka; uzupelnione.push('markę'); }
  if (k.typ && !form.querySelector('input[name=typ]:checked')) {
    form.querySelector(`input[name=typ][value="${k.typ}"]`).checked = true;
    uzupelnione.push('typ');
  }
  if (k.opis && !form.elements.opis.value.trim()) { form.elements.opis.value = k.opis; uzupelnione.push('opis'); }
  if (k.porcjaProducenta && !form.elements.porcjaProducenta.value.trim()) {
    form.elements.porcjaProducenta.value = k.porcjaProducenta;
    uzupelnione.push('porcję');
  }
  podpowiedz.textContent = `Z katalogu ${k.marka}${uzupelnione.length ? ` — uzupełniono: ${uzupelnione.join(', ')}` : ''}.`;
}

function widokKatalog() {
  const f = stan.filtrKatalogu;
  return `${naglowek('Katalog Mariage Frères', '#/kolekcja')}
  <section class="narzedzia">
    <p class="wstep">Herbaty ze sklepu. Stuknij <b>+ chcę kupić</b>, a herbata trafi do kolekcji ze statusem „chcę kupić”.</p>
    <input type="search" id="szukaj-katalog" placeholder="Szukaj: nazwa, opis…" value="${esc(f.tekst)}" autocomplete="off">
    <div class="chipy przewijane" role="group" aria-label="Typ">
      <button class="chip ${f.typ === 'wszystkie' ? 'wybrany' : ''}" data-akcja="katalog-typ" data-k="wszystkie">każdy typ</button>
      ${TYPY.map(t => `<button class="chip ${f.typ === t.k ? 'wybrany' : ''}" data-akcja="katalog-typ" data-k="${t.k}">${kropkaTypu(t.k)}${t.n}</button>`).join('')}
    </div>
  </section>
  <div id="lista-katalogu"></div>`;
}

function listaKatalogu() {
  if (!stan.katalog) return '<p class="pusto">Wczytuję katalog…</p>';
  const f = stan.filtrKatalogu;
  const q = f.tekst.trim().toLocaleLowerCase('pl');
  const lista = stan.katalog.filter(k =>
    (f.typ === 'wszystkie' || k.typ === f.typ) &&
    (!q || `${k.nazwa} ${k.opis}`.toLocaleLowerCase('pl').includes(q)));
  if (!lista.length) return '<p class="pusto">Nic nie pasuje.</p>';
  return `<ul class="lista">${lista.map(k => `<li class="karta pozycja katalog-pozycja">
    <span class="pozycja-nazwa">${esc(k.nazwa)}</span>
    <span class="pozycja-meta">${k.typ ? `${kropkaTypu(k.typ)}${typ(k.typ).n} · ` : ''}<i>${esc(k.opis)}</i>${k.porcjaProducenta ? ` · ${esc(k.porcjaProducenta)}` : ''}</span>
    <span class="pozycja-dol">${przyciskKatalogu(k)}</span>
  </li>`).join('')}</ul>`;
}

function przyciskKatalogu(k) {
  const h = herbataWKolekcji(k);
  return h
    ? `<a class="w-kolekcji" href="#/herbata/${h.id}">w kolekcji${h.status ? ` · ${status(h.status).n}` : ''} ›</a>`
    : `<button class="przycisk maly" data-akcja="dodaj-z-katalogu" data-id="${k.id}">+ chcę kupić</button>`;
}

async function dodajZKatalogu(el) {
  const k = stan.katalog.find(x => x.id === el.dataset.id);
  if (!k || herbataWKolekcji(k)) return;
  const czas = teraz();
  const h = {
    id: k.id, nazwa: k.nazwa, marka: k.marka, typ: k.typ, pochodzenie: '', aromaty: [],
    kubki: '', status: 'chce', link: '', opis: k.opis, porcjaProducenta: k.porcjaProducenta, utworzono: czas, zmieniono: czas,
  };
  await db.zapisz('herbaty', h);
  stan.herbaty.push(h);
  db.poprosOTrwalosc();
  el.outerHTML = przyciskKatalogu(k);
  toast('Dodano do „chcę kupić”');
}

async function wczytajKatalog() {
  try {
    const odp = await fetch('data/katalog.json');
    if (!odp.ok) return;
    const dane = await odp.json();
    stan.katalog = (dane.katalogi || []).flatMap(k => k.herbaty)
      .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
    stan.katalogWgNazwy = new Map();
    stan.katalog.forEach(k => {
      const kl = kluczNazwy(k.nazwa);
      if (!stan.katalogWgNazwy.has(kl)) stan.katalogWgNazwy.set(kl, []);
      stan.katalogWgNazwy.get(kl).push(k);
    });
  } catch { return; }
  // Odśwież to, co zależy od katalogu, jeśli jest na ekranie.
  const dl = $('#katalog-nazw');
  if (dl) dl.innerHTML = opcjeKatalogu();
  if ($('#lista-katalogu')) $('#lista-katalogu').innerHTML = listaKatalogu();
  if ($('#lista-herbat') && stan.filtr.status === 'chce') $('#lista-herbat').innerHTML = listaHerbat();
}

function widokFormDegustacji(id, params) {
  const d = id ? stan.degustacje.find(x => x.id === id) : null;
  if (id && !d) return `${naglowek('Brak wpisu', '#/degustacje')}<p class="pusto">Ta degustacja nie istnieje.</p>`;
  const herbataId = d ? d.herbataId : params.get('herbata') || '';
  const w = d || { data: dzisiaj(), herbataId, ...ostatnieParametry(herbataId) };
  return `${naglowek(d ? 'Edytuj degustację' : 'Degustacja', herbataId && !d ? `#/herbata/${herbataId}` : '#/degustacje')}
  <form id="form-degustacja" class="formularz karta" data-id="${d ? d.id : ''}" autocomplete="off">
    <input type="hidden" name="herbataId" value="${esc(w.herbataId)}">
    <div id="wybor-herbaty">${wyborHerbaty(w.herbataId)}</div>
    <fieldset><legend>Ocena</legend>
      <input type="hidden" name="ocena" value="${w.ocena || ''}">
      <div class="ocena" role="radiogroup" aria-label="Ocena 1–5">
        ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="gwiazda ${w.ocena >= i ? 'wlaczona' : ''}" data-akcja="ocena" data-o="${i}" aria-label="${i}">★</button>`).join('')}
      </div>
    </fieldset>
    <div class="rzad">
      <label><span>Temperatura <small>°C</small></span><input name="temperatura" type="number" inputmode="numeric" min="0" max="100" value="${w.temperatura ?? ''}" placeholder="np. 85"></label>
      <label><span>Czas <small>min</small></span><input name="czas" inputmode="decimal" value="${fmtCzas(w.czas)}" placeholder="np. 3 lub 2:30"></label>
    </div>
    <label>Data<input name="data" type="date" value="${esc(w.data)}" required></label>
    <label>Notatka smakowa<textarea name="notatka" rows="3" placeholder="co czujesz?">${esc(w.notatka)}</textarea></label>
    <div class="przyklejone">
      <button class="przycisk glowny szeroki" type="submit">Zapisz</button>
    </div>
    ${d ? `<button type="button" class="przycisk ostrozny szeroki" data-akcja="usun-degustacje" data-id="${d.id}">Usuń degustację</button>` : ''}
  </form>`;
}

// Parametry z ostatniej degustacji tej herbaty — żeby nie wpisywać ich co raz.
function ostatnieParametry(herbataId) {
  const ost = sortujDegustacje(degustacjeHerbaty(herbataId))[0];
  return ost ? { temperatura: ost.temperatura, czas: ost.czas } : {};
}

function wyborHerbaty(herbataId, szukane = '') {
  const h = herbata(herbataId);
  if (h) {
    return `<div class="wybrana-herbata"><div><small>Herbata</small><b>${esc(h.nazwa)}</b>${h.marka ? `<span>${esc(h.marka)}</span>` : ''}</div>
      <button type="button" class="przycisk maly" data-akcja="zmien-herbate">zmień</button></div>`;
  }
  if (!stan.herbaty.length) {
    return '<p class="pusto">Najpierw dodaj herbatę do <a href="#/herbata/nowa">kolekcji</a>.</p>';
  }
  // Najpierw ostatnio degustowane, potem te, które masz.
  const ostatnie = [...new Set(sortujDegustacje(stan.degustacje).map(d => d.herbataId))].map(herbata).filter(Boolean);
  const reszta = stan.herbaty.filter(x => !ostatnie.includes(x)).sort((a, b) => (a.status === 'mam' ? 0 : 1) - (b.status === 'mam' ? 0 : 1) || a.nazwa.localeCompare(b.nazwa, 'pl'));
  const q = szukane.trim().toLocaleLowerCase('pl');
  const lista = [...ostatnie, ...reszta].filter(x => !q || `${x.nazwa} ${x.marka || ''}`.toLocaleLowerCase('pl').includes(q)).slice(0, 12);
  return `<fieldset><legend>Herbata</legend>
    <input type="search" id="szukaj-herbaty" placeholder="Szukaj herbaty…" value="${esc(szukane)}">
    <div class="chipy wybor">${lista.map(x => `<button type="button" class="chip" data-akcja="wybierz-herbate" data-id="${x.id}">${esc(x.nazwa)}${x.marka ? ` <small>${esc(x.marka)}</small>` : ''}</button>`).join('') || '<p class="pusto">Brak wyników.</p>'}</div>
  </fieldset>`;
}

function statystyki() {
  const deg = stan.degustacje;
  const ocenione = deg.filter(d => d.ocena);
  const wgTypu = new Map();
  deg.forEach(d => {
    const h = herbata(d.herbataId);
    if (!h || !h.typ) return;
    const e = wgTypu.get(h.typ) || { ile: 0, oceny: [] };
    e.ile++;
    if (d.ocena) e.oceny.push(d.ocena);
    wgTypu.set(h.typ, e);
  });
  const typy = [...wgTypu].map(([k, e]) => ({ k, ile: e.ile, sr: srednia(e.oceny) }))
    .sort((a, b) => b.ile - a.ile || (b.sr || 0) - (a.sr || 0));
  const maxIle = Math.max(1, ...typy.map(t => t.ile));
  const top = stan.herbaty.map(h => {
    const oc = degustacjeHerbaty(h.id).map(d => d.ocena).filter(Boolean);
    return { h, sr: srednia(oc), ile: oc.length };
  }).filter(x => x.sr != null).sort((a, b) => b.sr - a.sr || b.ile - a.ile).slice(0, 5);

  return `<section class="karta statystyki">
    <div class="liczby">
      <div><b>${deg.length}</b><small>degustacji</small></div>
      <div><b>${new Set(deg.map(d => d.herbataId)).size}</b><small>herbat</small></div>
      <div><b>${fmtSr(srednia(ocenione.map(d => d.ocena)))}</b><small>śr. ocena</small></div>
    </div>
    ${typy.length ? `<h3 class="sekcja">Ulubione typy</h3>
    <ul class="slupki">${typy.map(t => `<li>
      <span class="slupek-etykieta">${kropkaTypu(t.k)}${typ(t.k).n}</span>
      <span class="slupek"><span style="width:${(t.ile / maxIle) * 100}%"></span></span>
      <span class="slupek-liczba">${t.ile}× · ${fmtSr(t.sr)}★</span></li>`).join('')}</ul>` : ''}
    ${top.length ? `<h3 class="sekcja">Najwyżej oceniane</h3>
    <ol class="top">${top.map(x => `<li><a href="#/herbata/${x.h.id}">${esc(x.h.nazwa)}</a> ${gwiazdki(Math.round(x.sr), 'male')} <small>${fmtSr(x.sr)} · ${x.ile}×</small></li>`).join('')}</ol>` : ''}
  </section>`;
}

function widokDegustacje() {
  const deg = sortujDegustacje(stan.degustacje);
  return `${naglowek('Degustacje')}
  ${deg.length ? statystyki() : ''}
  <h3 class="sekcja">Historia</h3>
  ${deg.length ? `<ul class="lista">${deg.map(d => pozycjaDegustacji(d, true)).join('')}</ul>`
    : '<div class="pusto karta"><p>Brak degustacji.</p><p>Otwórz herbatę w kolekcji i stuknij <b>Degustuję</b> — albo użyj przycisku poniżej.</p></div>'}
  <a class="fab" href="#/degustacja/nowa" aria-label="Dodaj degustację">+ degustacja</a>`;
}

function widokKopia() {
  return `${naglowek('Kopia')}
  <section class="karta tresc">
    <h3 class="sekcja">Kopia zapasowa</h3>
    <p>Dane są tylko na tym urządzeniu (w przeglądarce). Eksport zapisuje je do pliku JSON — trzymaj go np. na Dysku.</p>
    <p class="liczby-male">${stan.herbaty.length} herbat · ${stan.degustacje.length} degustacji</p>
    <button class="przycisk glowny szeroki" data-akcja="eksport">Eksportuj do pliku</button>
    <h3 class="sekcja">Przywracanie</h3>
    <p>Import dopisuje wpisy z pliku. Wpisy o tym samym identyfikatorze zostaną zastąpione wersją z pliku; nic nie jest usuwane.</p>
    <label class="przycisk szeroki">Importuj z pliku<input type="file" id="plik-importu" accept="application/json,.json" hidden></label>
  </section>
  <p class="stopka">Herbatnik · wersja <span id="wersja"></span></p>`;
}

// ---------- Routing ----------
function trasa() {
  const [sciezka, zapytanie] = (location.hash.slice(1) || '/kolekcja').split('?');
  const cz = sciezka.split('/').filter(Boolean);
  const params = new URLSearchParams(zapytanie || '');
  if (cz[0] === 'herbata' && cz[1] === 'nowa') return { zakladka: 'kolekcja', html: widokFormHerbaty(null) };
  if (cz[0] === 'herbata' && cz[2] === 'edytuj') return { zakladka: 'kolekcja', html: widokFormHerbaty(cz[1]) };
  if (cz[0] === 'herbata' && cz[1]) return { zakladka: 'kolekcja', html: widokHerbata(cz[1]) };
  if (cz[0] === 'degustacja' && cz[1] === 'nowa') return { zakladka: 'degustacje', html: widokFormDegustacji(null, params) };
  if (cz[0] === 'degustacja' && cz[1]) return { zakladka: 'degustacje', html: widokFormDegustacji(cz[1], params) };
  if (cz[0] === 'degustacje') return { zakladka: 'degustacje', html: widokDegustacje() };
  if (cz[0] === 'kopia') return { zakladka: 'kopia', html: widokKopia() };
  if (cz[0] === 'katalog') return { zakladka: 'kolekcja', html: widokKatalog(), poRenderze: () => { $('#lista-katalogu').innerHTML = listaKatalogu(); } };
  return { zakladka: 'kolekcja', html: widokKolekcja(), poRenderze: () => { $('#lista-herbat').innerHTML = listaHerbat(); } };
}

function renderuj() {
  const t = trasa();
  const main = $('#main');
  main.innerHTML = t.html;
  if (t.poRenderze) t.poRenderze();
  const w = $('#wersja');
  if (w) w.textContent = window.HERBATNIK_WERSJA || '';
  document.querySelectorAll('.nawigacja a').forEach(a => a.classList.toggle('aktywny', a.dataset.zakladka === t.zakladka));
}

// ---------- Akcje ----------
async function zapiszHerbate(form) {
  const f = new FormData(form);
  const id = form.dataset.id;
  const stara = id ? herbata(id) : null;
  const h = {
    ...(stara || {}),
    id: id || uid(),
    nazwa: f.get('nazwa').trim(),
    marka: f.get('marka').trim(),
    typ: f.get('typ') || '',
    pochodzenie: f.get('pochodzenie').trim(),
    aromaty: f.get('aromaty').split(',').map(s => s.trim()).filter(Boolean),
    kubki: f.get('kubki').trim(),
    opis: f.get('opis').trim(),
    porcjaProducenta: f.get('porcjaProducenta').trim(),
    status: f.get('status') || '',
    link: bezpiecznyLink(f.get('link')),
    utworzono: stara?.utworzono || teraz(),
    zmieniono: teraz(),
  };
  if (!h.nazwa) return;
  await db.zapisz('herbaty', h);
  if (stara) Object.assign(stara, h); else stan.herbaty.push(h);
  db.poprosOTrwalosc();
  toast('Zapisano');
  if (stara) wroc(`#/herbata/${h.id}`);
  else idzDo(`#/herbata/${h.id}`, { zastap: true });
}

async function zapiszDegustacje(form) {
  const f = new FormData(form);
  const herbataId = f.get('herbataId');
  if (!herbata(herbataId)) { toast('Wybierz herbatę'); return; }
  const id = form.dataset.id;
  const stara = id ? stan.degustacje.find(x => x.id === id) : null;
  const temp = f.get('temperatura');
  const d = {
    ...(stara || {}),
    id: id || uid(),
    herbataId,
    data: f.get('data') || dzisiaj(),
    temperatura: temp === '' ? null : Number(temp),
    czas: parsujCzas(f.get('czas')),
    ocena: Number(f.get('ocena')) || null,
    notatka: f.get('notatka').trim(),
    utworzono: stara?.utworzono || teraz(),
    zmieniono: teraz(),
  };
  await db.zapisz('degustacje', d);
  if (stara) Object.assign(stara, d); else stan.degustacje.push(d);
  db.poprosOTrwalosc();
  toast('Zapisano degustację');
  wroc(`#/herbata/${herbataId}`);
}

async function eksport() {
  const dane = { app: 'herbatnik', format: 1, eksport: teraz(), herbaty: stan.herbaty, degustacje: stan.degustacje };
  const blob = new Blob([JSON.stringify(dane, null, 2)], { type: 'application/json' });
  const nazwa = `herbatnik-kopia-${dzisiaj()}.json`;
  const plik = new File([blob], nazwa, { type: 'application/json' });
  // Na telefonie wygodniej przez „Udostępnij” (np. do Dysku); w innym razie zwykłe pobranie.
  if (navigator.canShare && navigator.canShare({ files: [plik] })) {
    try { await navigator.share({ files: [plik], title: nazwa }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nazwa;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function sprawdzImport(dane) {
  if (!dane || dane.app !== 'herbatnik' || !Array.isArray(dane.herbaty) || !Array.isArray(dane.degustacje)) {
    throw new Error('To nie jest plik kopii Herbatnika.');
  }
  const herbaty = dane.herbaty.filter(h => h && h.id && h.nazwa);
  const degustacje = dane.degustacje.filter(d => d && d.id && d.herbataId);
  return { herbaty, degustacje };
}

async function importuj(plik) {
  let dane;
  try { dane = sprawdzImport(JSON.parse(await plik.text())); }
  catch (e) { alert(`Nie udało się wczytać pliku: ${e.message}`); return; }
  if (!confirm(`Zaimportować ${dane.herbaty.length} herbat i ${dane.degustacje.length} degustacji?`)) return;
  await db.zapiszWiele('herbaty', dane.herbaty);
  await db.zapiszWiele('degustacje', dane.degustacje);
  await wczytaj();
  db.poprosOTrwalosc();
  toast('Zaimportowano');
  renderuj();
}

async function klik(e) {
  const el = e.target.closest('[data-akcja]');
  if (!el) return;
  const a = el.dataset.akcja;
  if (a === 'wstecz') {
    e.preventDefault();
    if (nawigacjaWewnetrzna && history.length > 1) history.back(); else idzDo(el.getAttribute('href'), { zastap: true });
  } else if (a === 'filtr-status' || a === 'filtr-typ') {
    stan.filtr[a === 'filtr-status' ? 'status' : 'typ'] = el.dataset.k;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('wybrany', c === el));
    $('#lista-herbat').innerHTML = listaHerbat();
  } else if (a === 'ustaw-status') {
    const h = herbata(el.dataset.id);
    h.status = el.dataset.k;
    h.zmieniono = teraz();
    await db.zapisz('herbaty', h);
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('wybrany', c === el));
  } else if (a === 'usun-herbate') {
    const h = herbata(el.dataset.id);
    const deg = degustacjeHerbaty(h.id);
    if (!confirm(`Usunąć „${h.nazwa}”${deg.length ? ` razem z ${deg.length} degustacjami` : ''}?`)) return;
    await db.usun('degustacje', deg.map(d => d.id));
    await db.usun('herbaty', h.id);
    stan.degustacje = stan.degustacje.filter(d => d.herbataId !== h.id);
    stan.herbaty = stan.herbaty.filter(x => x.id !== h.id);
    toast('Usunięto');
    idzDo('#/kolekcja', { zastap: true });
  } else if (a === 'usun-degustacje') {
    if (!confirm('Usunąć tę degustację?')) return;
    await db.usun('degustacje', el.dataset.id);
    stan.degustacje = stan.degustacje.filter(d => d.id !== el.dataset.id);
    toast('Usunięto');
    wroc('#/degustacje');
  } else if (a === 'ocena') {
    const form = el.form;
    const pole = form.elements.ocena;
    const o = Number(el.dataset.o);
    pole.value = Number(pole.value) === o ? '' : o;
    form.querySelectorAll('.gwiazda').forEach(g => g.classList.toggle('wlaczona', Number(g.dataset.o) <= Number(pole.value || 0)));
  } else if (a === 'wybierz-herbate' || a === 'zmien-herbate') {
    const form = el.closest('form');
    const id = a === 'wybierz-herbate' ? el.dataset.id : '';
    form.elements.herbataId.value = id;
    // Podpowiedz parametry z ostatniego parzenia, jeśli pola są puste.
    const ost = ostatnieParametry(id);
    if (form.elements.temperatura.value === '' && ost.temperatura != null) form.elements.temperatura.value = ost.temperatura;
    if (form.elements.czas.value === '' && ost.czas != null) form.elements.czas.value = fmtCzas(ost.czas);
    $('#wybor-herbaty').innerHTML = wyborHerbaty(id);
    if (!id) $('#szukaj-herbaty')?.focus();
  } else if (a === 'katalog-typ') {
    stan.filtrKatalogu.typ = el.dataset.k;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('wybrany', c === el));
    $('#lista-katalogu').innerHTML = listaKatalogu();
  } else if (a === 'wybierz-wariant') {
    // Wybór opisu w karcie: ustawia opis, a typ i porcję tylko jeśli są puste.
    const h = herbata(el.dataset.id);
    const w = h.warianty[Number(el.dataset.i)];
    h.opis = w.opis;
    if (!h.typ && w.typ) h.typ = w.typ;
    if (!h.porcjaProducenta && w.porcjaProducenta) h.porcjaProducenta = w.porcjaProducenta;
    h.zmieniono = teraz();
    await db.zapisz('herbaty', h);
    renderuj();
    toast('Zapisano wariant');
  } else if (a === 'wariant-katalogu') {
    uzupelnijZKatalogu(el.form, stan.katalog.find(k => k.id === el.dataset.id));
  } else if (a === 'dodaj-z-katalogu') {
    dodajZKatalogu(el);
  } else if (a === 'eksport') {
    eksport();
  }
}

// Stuknięcie w zaznaczony już typ/status odznacza go (oba są opcjonalne).
function zapamietajRadio(e) {
  const r = e.target.closest('label.chip')?.querySelector('input[type=radio]:is([name=typ],[name=status])');
  if (r) r.dataset.bylo = r.checked;
}
function odznaczRadio(e) {
  const r = e.target;
  if (r.matches?.('input[type=radio]:is([name=typ],[name=status])') && r.dataset.bylo === 'true') {
    r.checked = false;
    r.dataset.bylo = 'false';
  }
}

function wpisywanie(e) {
  if (e.target.name === 'nazwa' && e.target.form?.id === 'form-herbata') {
    uzupelnijZKatalogu(e.target.form);
  } else if (e.target.id === 'szukaj-katalog') {
    stan.filtrKatalogu.tekst = e.target.value;
    $('#lista-katalogu').innerHTML = listaKatalogu();
  } else if (e.target.id === 'szukaj') {
    stan.filtr.tekst = e.target.value;
    $('#lista-herbat').innerHTML = listaHerbat();
  } else if (e.target.id === 'szukaj-herbaty') {
    const v = e.target.value;
    $('#wybor-herbaty').innerHTML = wyborHerbaty('', v);
    const pole = $('#szukaj-herbaty');
    pole.focus();
    pole.setSelectionRange(v.length, v.length);
  }
}

// Herbaty startowe z data/seed.json (generowane z dane/import-*.json), śledzone pojedynczo:
// - nowa herbata z pliku → dodana (także gdy aplikacja jest już w użyciu),
// - herbata usunięta w aplikacji → nie wraca,
// - puste pole, dla którego plik ma nową wartość → uzupełnione; to, co wpisane w aplikacji, nie jest nadpisywane.
const POLA_SEED = ['marka', 'typ', 'pochodzenie', 'aromaty', 'kubki', 'status', 'link', 'opis', 'porcjaProducenta', 'warianty'];
const puste = v => v == null || v === '' || (Array.isArray(v) && !v.length);
const rowne = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

async function wczytajZestawyStartowe() {
  let seed;
  try {
    const odp = await fetch('data/seed.json', { cache: 'no-cache' });
    if (!odp.ok) return {};
    seed = await odp.json();
  } catch { return {}; } // offline przy pierwszym starcie — spróbujemy następnym razem
  const meta = (await db.pobierz('meta', 'seed')) || { klucz: 'seed', herbaty: {} };
  const przed = JSON.stringify(meta);
  if (!Object.keys(meta.herbaty).length && await db.pobierz('meta', 'zestawy')) {
    // Migracja z 0.2.0 (zestawy wczytywane w całości): tamte herbaty miały same puste pola.
    stan.herbaty.filter(h => h.id.startsWith('seed-')).forEach(h => { meta.herbaty[h.id] = {}; });
  }
  const wBazie = new Map(stan.herbaty.map(h => [h.id, h]));
  const czas = teraz();
  const dodane = [], uzupelnione = [];
  for (const sh of (seed.zestawy || []).flatMap(z => z.herbaty)) {
    if (!sh.id || !sh.nazwa) continue;
    const znane = meta.herbaty[sh.id];
    const h = wBazie.get(sh.id);
    if (!znane && !h) {
      dodane.push({ ...sh, link: bezpiecznyLink(sh.link), utworzono: czas, zmieniono: czas });
    } else if (h) {
      const pola = POLA_SEED.filter(p => puste(h[p]) && !puste(sh[p]) && !rowne(sh[p], znane?.[p]));
      pola.forEach(p => { h[p] = p === 'link' ? bezpiecznyLink(sh[p]) : sh[p]; });
      if (pola.length) { h.zmieniono = czas; uzupelnione.push(h); }
    }
    meta.herbaty[sh.id] = Object.fromEntries(POLA_SEED.map(p => [p, sh[p] ?? '']));
  }
  if (dodane.length || uzupelnione.length) await db.zapiszWiele('herbaty', [...dodane, ...uzupelnione]);
  if (JSON.stringify(meta) !== przed) await db.zapisz('meta', meta);
  stan.herbaty.push(...dodane);
  return { dodane: dodane.length, uzupelnione: uzupelnione.length };
}

async function wczytaj() {
  [stan.herbaty, stan.degustacje] = await Promise.all([db.wszystkie('herbaty'), db.wszystkie('degustacje')]);
}

export async function start() {
  const main = $('#main');
  main.addEventListener('click', klik);
  main.addEventListener('pointerdown', zapamietajRadio);
  main.addEventListener('click', odznaczRadio);
  main.addEventListener('input', wpisywanie);
  main.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'form-herbata') zapiszHerbate(e.target);
    if (e.target.id === 'form-degustacja') zapiszDegustacje(e.target);
  });
  main.addEventListener('change', e => {
    if (e.target.id === 'plik-importu' && e.target.files[0]) importuj(e.target.files[0]);
  });
  document.querySelector('.nawigacja').innerHTML = [
    ['kolekcja', 'Kolekcja'], ['degustacje', 'Degustacje'], ['kopia', 'Kopia'],
  ].map(([k, n]) => `<a href="#/${k}" data-zakladka="${k}">${ikony[k]}<span>${n}</span></a>`).join('');

  window.addEventListener('hashchange', () => { nawigacjaWewnetrzna = true; renderuj(); window.scrollTo(0, 0); });
  try {
    await wczytaj();
    const { dodane, uzupelnione } = await wczytajZestawyStartowe();
    const info = [dodane && `dodano ${dodane} herbat`, uzupelnione && `uzupełniono ${uzupelnione}`].filter(Boolean).join(' · ');
    if (info) toast(`Kolekcja: ${info}`);
  } catch (e) {
    main.innerHTML = `<p class="pusto">Nie mogę otworzyć bazy danych w tej przeglądarce (${esc(e.message)}). W trybie prywatnym niektóre przeglądarki blokują zapis.</p>`;
    return;
  }
  renderuj();
  wczytajKatalog();
}
