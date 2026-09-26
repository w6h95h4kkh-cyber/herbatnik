# Plan i decyzje

## Model danych (IndexedDB `herbatnik`)

**herbaty** — `id, nazwa, marka, typ, pochodzenie, aromaty[], kubki, status, utworzono, zmieniono`
- `typ`: czarna · zielona · żółta · oolong · biała · ciemna/pu-erh · ziołowa (opcjonalny)
- `status`: mam · wypita · chcę kupić
- `kubki`: tekst („2–3”)

**degustacje** — `id, herbataId, data, temperatura (°C), czas (s), ocena 1–5, notatka, utworzono, zmieniono` (wszystko poza herbatą opcjonalne)

**wiedza** (etap 2, tylko do odczytu, generowana z `wiedza/*.md` do `app/data/wiedza.json`) — `notatki[]: slug, tytuł, autor, rok, nurt, tagi, sekcje[] (nagłówek, html)`; `fiszki[]: pytanie, odpowiedź, źródło (slug#sekcja)`.

## Etapy

1. ✅ **MVP: Kolekcja + Degustacje** — karta herbaty, filtry/wyszukiwarka, degustacja w ≤3 tapnięciach, historia + statystyki, eksport/import JSON, PWA offline, GitHub Pages.
2. **Nauka: przeglądarka** — skrypt build `wiedza/*.md → JSON` (frontmatter YAML, callouty, wikilinki → linki wewnętrzne), zakładka Nauka z nurtami jak w hubie, widok notatki.
3. **Nauka: fiszki i quiz** — generowane z treści notatek (najpierw Gebely i Liu Tong); karta herbaty linkuje do wiedzy o swoim typie.

## Decyzje (rozstrzygnięte samodzielnie)

- **Bez frameworka i bez bundlera** — czysty JS (moduły ES). Najmniej rzeczy, które mogą się zepsuć; działa od razu z GitHub Pages.
- **Pages przez GitHub Actions** z katalogu `app/`. W etapie 2 ten sam workflow uruchomi skrypt budujący wiedzę.
- **Fonty self-hosted** (latin + latin-ext, dla polskich znaków) zamiast Google Fonts — działają offline i bez zewnętrznych zapytań.
- **Import = scalanie** (upsert po `id`), nigdy nie kasuje. Jedyna operacja kasująca to ręczne „Usuń” z potwierdzeniem.
- **Usunięcie herbaty usuwa jej degustacje** (z potwierdzeniem, pokazuje ile).
- **Temperatura i czas** podpowiadają się z ostatniej degustacji tej samej herbaty — bez domyślnych wartości „z wiedzy ogólnej”.
- **Degustacja w 3 tapnięciach:** z karty herbaty: *Degustuję → gwiazdka → Zapisz*; z zakładki Degustacje: *+ → herbata → Zapisz*. Data domyślnie dziś.
- **Kolekcja grupowana wg marki** (MF / Kusmi / PdT naturalnie się rozdzielają), w grupie alfabetycznie.
- **71 herbat z kalendarzy** — nie wpisuję ich z pamięci (nie znam dokładnych składów kalendarzy). Można je dodać ręcznie albo przygotować listę i wczytać importem (format w README).
- **Nazwa** herbaty jest jedynym wymaganym polem.
- Ceny, zdjęcia, zestawy/kalendarze jako osobne pole — nie dodane (nie było w specyfikacji) → `POMYSLY.md`.
