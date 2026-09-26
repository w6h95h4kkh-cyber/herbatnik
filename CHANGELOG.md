# Changelog

## 0.4.0 — 2026-09-26 — Katalog MF komplet, wybór wariantu w karcie
- Katalog Mariage Frères: 782 pozycje; podpowiedź nazwy pokazuje liczbę wariantów, formularz wszystkie warianty z opisem.
- Kolekcja startowa: 43/72 herbat z opisem producenta (42 z typem, 29 z porcją).
- Nowe pole z importu `warianty_w_katalogu`: karta herbaty bez opisu pokazuje możliwe opisy do wyboru; wybór ustawia opis, a typ i porcję tylko, jeśli są puste.
- Szybsze dopasowywanie nazw (indeks katalogu) — płynnie na telefonie przy setkach pozycji.

## 0.3.0 — 2026-09-26 — Katalog Mariage Frères
- Kolekcja startowa: 72 herbaty MF (30 z typem i opisem producenta, 13 z porcją producenta).
- Seed śledzony pojedynczo: nowe herbaty dopisują się, puste pola uzupełniają, edycje w aplikacji nie są nadpisywane, usunięte nie wracają.
- Karta herbaty: **opis producenta** i **porcja wg producenta** (oba edytowalne w formularzu).
- Katalog MF (388 pozycji): autouzupełnianie przy dodawaniu herbaty (nazwa → marka, typ, opis, porcja; wybór wariantu, gdy nazwa jest niejednoznaczna) oraz przeglądarka katalogu z przyciskiem „+ chcę kupić” (Kolekcja → „chcę kupić”).
- Wyszukiwarka kolekcji przeszukuje też opis producenta.

## 0.2.0 — 2026-09-26 — Herbaty startowe
- 36 herbat Mariage Frères z `dane/import-mariage-freres.json` wczytuje się do kolekcji przy pierwszym uruchomieniu; puste pola zostają puste do uzupełnienia.
- Nowe pole **Link** na karcie herbaty (np. Steepster), edytowalne w formularzu.
- Status herbaty może być pusty (odznaczany w formularzu).
- `scripts/build.mjs` generuje `app/data/seed.json`; workflow Pages uruchamia go przy deployu.

## 0.1.0 — 2026-09-26 — Etap 1: Kolekcja + Degustacje (MVP)
- Kolekcja: karta herbaty (nazwa, marka, typ, pochodzenie, aromaty, kubki z porcji, status), grupowanie wg marki, wyszukiwarka, filtry statusu i typu, zmiana statusu jednym stuknięciem na karcie.
- Degustacje: szybki wpis (data, herbata, temperatura, czas, ocena 1–5, notatka) — ≤3 tapnięcia; podpowiedź temperatury i czasu z ostatniego parzenia; edycja i usuwanie.
- Statystyki: liczba degustacji i herbat, średnia ocena, ulubione typy, najwyżej oceniane herbaty.
- Kopia: eksport do JSON (na telefonie przez „Udostępnij”), import scalający.
- PWA: manifest, ikony, service worker — instalacja i praca offline.
- Styl „herbaciarnia / vintage”: krem #fdf6ec, złoto #c8a060, podwójne ramki, Playfair Display + Cormorant Garamond, nagłówki i przyciski Syne.
- GitHub Pages przez GitHub Actions; test end-to-end (Playwright).
