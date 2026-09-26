# Herbatnik

Prywatna aplikacja herbaciana (PWA): **Kolekcja** herbat i **Degustacje**. Działa w przeglądarce telefonu, można ją zainstalować na ekranie głównym i używać offline. Bez backendu — dane zostają na urządzeniu (IndexedDB), a kopię robisz eksportem do pliku JSON.

## Jak uruchomić lokalnie

```bash
python3 -m http.server 8123 -d app
# otwórz http://localhost:8123
```

Nie trzeba niczego instalować ani budować — aplikacja to czysty HTML/CSS/JS w katalogu `app/`.

## Hosting (GitHub Pages)

Workflow `.github/workflows/pages.yml` publikuje katalog `app/` przy każdym pushu na `main`.
Jednorazowo w repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Adres: `https://<użytkownik>.github.io/herbatnik/`.

### Instalacja na telefonie
- **Android / Chrome:** menu ⋮ → „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.
- **iPhone / Safari:** Udostępnij → „Do ekranu początkowego”.

## Herbaty startowe (seed) i katalog sklepu

**`dane/import-*.json`**: herbaty wczytywane do KOLEKCJI przy uruchomieniu aplikacji. Każda herbata jest śledzona osobno:
- nowa herbata w pliku → dopisuje się przy następnym otwarciu aplikacji (także na telefonie, gdzie aplikacja jest już używana);
- herbata usunięta w aplikacji → nie wraca;
- pole puste w aplikacji, a w pliku pojawiła się wartość → uzupełnia się;
- **to, co wpisałaś w aplikacji, nigdy nie jest nadpisywane**. Jeśli wyczyścisz pole, które przyszło z pliku, nie wróci (chyba że w pliku zmieni się jego wartość).

Format: `{ "herbaty": [ { "nazwa", "marka", "typ", "pochodzenie", "aromaty": [], "kubki_z_porcji", "status", "zrodlo", "opis_producenta", "porcja_producent", "warianty_w_katalogu": [] } ] }`. Pola `null` zostają puste. `warianty_w_katalogu` to lista możliwych opisów z katalogu. Dopóki opis jest pusty, karta herbaty pokazuje je do wyboru, a wybór ustawia opis (oraz typ i porcję z katalogu, jeśli te są puste). `zrodlo` → pole **Link**, `opis_producenta` → **Opis producenta**, `porcja_producent` → **Porcja wg producenta** (np. „100g ~ about 40 cups”; to co innego niż „kubki z jednej porcji”, które wpisujesz sama).

**`dane/katalog-*.json`**: katalog sklepu (`{ "herbaty": [ { "nazwa", "opis_producenta", "typ", "porcja" } ] }`, marka z nazwy pliku). Nie trafia do kolekcji sam z siebie. Służy do:
- **autouzupełniania**: przy dodawaniu herbaty wpisz lub wybierz nazwę z listy, a puste pola marka, typ, opis i porcja uzupełnią się same; gdy pod jedną nazwą jest kilka produktów (np. Lily Muguet: czarna, zielona, biała), aplikacja pokaże wszystkie warianty z opisem do wyboru;
- **listy „chcę kupić”**: Kolekcja → filtr „chcę kupić” → „Wybierz z katalogu Mariage Frères” → „+ chcę kupić”.

Typy z danych mapowane na 7 typów aplikacji: rooibos, mate i owocowa → ziołowa; „mieszanka” → pusty.

Po zmianie w `dane/` uruchom `node scripts/build.mjs`: wygeneruje `app/data/seed.json` i `app/data/katalog.json` (workflow Pages robi to też sam przy deployu). Potem podbij wersję (sekcja „Aktualizacja aplikacji”).

## Dane i kopia zapasowa

- Wszystko zapisuje się w przeglądarce na tym urządzeniu. Usunięcie danych witryny = utrata danych, więc co jakiś czas: zakładka **Kopia → Eksportuj do pliku**.
- **Import** dopisuje wpisy z pliku; wpis o tym samym `id` zostaje zastąpiony wersją z pliku; nic nie jest kasowane.
- Format pliku (np. żeby przygotować listę 71 herbat z kalendarzy w arkuszu i wczytać ją naraz):

```json
{
  "app": "herbatnik",
  "format": 1,
  "herbaty": [
    { "id": "mf-2025-01", "nazwa": "Marco Polo", "marka": "Mariage Frères", "typ": "czarna",
      "pochodzenie": "Chiny", "aromaty": ["owoce", "kwiaty"], "kubki": "2–3", "status": "mam",
      "link": "https://steepster.com/…", "opis": "Fruity & flowery black tea", "porcjaProducenta": "100g ~ about 40 cups" }
  ],
  "degustacje": [
    { "id": "d1", "herbataId": "mf-2025-01", "data": "2025-12-01", "temperatura": 90,
      "czas": 180, "ocena": 4, "notatka": "słodka, kwiatowa" }
  ]
}
```

`typ`: `czarna | zielona | zolta | oolong | biala | ciemna | ziolowa` (lub puste). `status`: `mam | wypita | chce` (lub puste). `czas` w sekundach. Wymagane są tylko `id` i `nazwa` (herbata) oraz `id` i `herbataId` (degustacja).

## Aktualizacja aplikacji

Service worker trzyma aplikację w cache. Po zmianie plików w `app/` podbij wersję w `app/sw.js` (`WERSJA`) i w `app/index.html` (`HERBATNIK_WERSJA`) — inaczej telefon dalej pokaże starą wersję. Nowe pliki dopisz do listy `PLIKI` w `sw.js`.

## Testy

```bash
python3 -m http.server 8123 -d app &
NODE_PATH=$(npm root -g) node tests/e2e.mjs   # wymaga globalnie zainstalowanego playwright
```

Test przechodzi całą ścieżkę na emulowanym Pixelu 7: wczytanie herbat startowych i aktualizacja z 0.2.0 bez nadpisania edycji, autouzupełnianie i katalog „chcę kupić”, dodanie herbaty, degustacja w 3 tapnięciach, statystyki, filtry, eksport → import, działanie offline.

## Wiedza (etap 2)

Notatki z Obsidiana leżą w `wiedza/`. Zakładka **Nauka** (etap 2) będzie generowana z nich skryptem przy buildzie — instrukcja dodawania wiedzy pojawi się tu razem z nią.

## Struktura

```
app/            aplikacja (to idzie na GitHub Pages)
  js/app.js     widoki, routing, logika
  js/db.js      IndexedDB
  sw.js         service worker (offline)
  fonts/        Playfair Display, Cormorant Garamond, Syne (self-hosted, OFL)
  data/          seed.json, katalog.json (generowane — nie edytuj ręcznie)
  js/wspolne.js  id herbat i mapowanie typów (wspólne z build.mjs)
dane/           import-*.json (kolekcja startowa), katalog-*.json (katalog sklepu)
wiedza/         notatki książkowe (źródło treści Nauki)
scripts/        build.mjs (dane → app/data), ikony.mjs (render ikon)
tests/          test end-to-end
```

Plan etapów i decyzje: [PLAN.md](PLAN.md) · pomysły na później: [POMYSLY.md](POMYSLY.md) · zmiany: [CHANGELOG.md](CHANGELOG.md).
