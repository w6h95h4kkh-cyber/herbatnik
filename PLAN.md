# Plan i decyzje

## Model danych (IndexedDB `herbatnik`)

**herbaty** — `id, nazwa, marka, typ, pochodzenie, aromaty[], kubki, status, utworzono, zmieniono`
- `typ`: czarna · zielona · żółta · oolong · biała · ciemna/pu-erh · ziołowa (opcjonalny)
- `status`: mam · wypita · chcę kupić (opcjonalny)
- `kubki`: tekst („2–3”)
- `link`: adres http(s), np. Steepster
- `opis`: opis producenta; `porcjaProducenta`: np. „100g ~ about 40 cups”

**meta** — `seed.herbaty{id → wartości z pliku}`: które herbaty startowe już wczytano i jakie wartości wtedy miały (żeby uzupełniać tylko puste pola i nie przywracać tego, co wyczyściłaś)

**katalog** (tylko do odczytu, `app/data/katalog.json`): `id, nazwa, marka, typ, opis, porcjaProducenta`

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
- **Herbaty startowe** z `dane/import-*.json` → `app/data/seed.json` (skrypt `scripts/build.mjs`), śledzone pojedynczo (od 0.3.0; w 0.2.0 całymi plikami): nowe dopisują się, usunięte nie wracają, puste pola uzupełniają się, edycje w aplikacji nie są nadpisywane. Id herbaty = `seed-<marka>-<nazwa>` (stałe, więc kopia/import nie dubluje wpisów; herbata dodana z katalogu ma to samo id co w imporcie).
- Migracja z 0.2.0: herbaty startowe usunięte w 0.2.0 z pierwszych 36 mogłyby wrócić (0.2.0 nie zapisywała pojedynczych id). Akceptuję: aplikacja nie była jeszcze wdrożona.
- **Katalog sklepu**: identyczne powtórzenia scalone; różne produkty pod tą samą nazwą (31 nazw w katalogu MF, np. Bel Ami: oolong i rooibos) zostają osobno (`-2`, `-3` w id) i przy autouzupełnianiu są pokazywane do wyboru.
- **Typy spoza 7**: rooibos, mate, owocowa → ziołowa (to napary, nie herbata z *Camellia sinensis*); „mieszanka” → pusty typ (nie zgaduję).
- **„porcja” producenta ≠ „kubki z jednej porcji”**: to osobne pole (`porcjaProducenta`), nie wpisuję go do kubków.
- Autouzupełnianie i dodawanie z katalogu uzupełnia tylko puste pola; niczego wpisanego nie nadpisuje.
- **Pola `null` z importu zostają puste** — również status (herbata nie ma wtedy żadnego statusu, widać ją w „wszystkie”). Typy i nuty uzupełnia Misia.
- Stuknięcie w zaznaczony status/typ w formularzu odznacza go.
- **Nazwa** herbaty jest jedynym wymaganym polem.
- Ceny, zdjęcia, zestawy/kalendarze jako osobne pole — nie dodane (nie było w specyfikacji) → `POMYSLY.md`.
