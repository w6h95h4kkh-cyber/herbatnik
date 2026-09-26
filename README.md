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

## Herbaty startowe (seed)

Pliki `dane/import-*.json` to listy herbat wczytywane do KOLEKCJI przy uruchomieniu aplikacji. Każdy plik (zestaw) wczytuje się **jeden raz** na danym urządzeniu: potem herbaty są zwykłymi wpisami (edytujesz je i usuwasz jak inne), a usunięta herbata nie wraca. Nowy plik (np. `dane/import-kusmi.json`) doda się przy następnym otwarciu aplikacji, także tam, gdzie już jest używana.

Format pliku: `{ "herbaty": [ { "nazwa", "marka", "typ", "pochodzenie", "aromaty": [], "kubki_z_porcji", "status", "zrodlo" } ] }`. Pola `null` zostają puste (do uzupełnienia w aplikacji), a `zrodlo` (link, np. Steepster) trafia do pola **Link** na karcie herbaty.

Po zmianie w `dane/` uruchom `node scripts/build.mjs`: wygeneruje `app/data/seed.json` (workflow Pages robi to też sam przy deployu). Potem podbij wersję (sekcja „Aktualizacja aplikacji”).

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
      "link": "https://steepster.com/…" }
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

Test przechodzi całą ścieżkę na emulowanym Pixelu 7: wczytanie herbat startowych, dodanie herbaty, degustacja w 3 tapnięciach, statystyki, filtry, eksport → import, działanie offline.

## Wiedza (etap 2)

Notatki z Obsidiana leżą w `wiedza/`. Zakładka **Nauka** (etap 2) będzie generowana z nich skryptem przy buildzie — instrukcja dodawania wiedzy pojawi się tu razem z nią.

## Struktura

```
app/            aplikacja (to idzie na GitHub Pages)
  js/app.js     widoki, routing, logika
  js/db.js      IndexedDB
  sw.js         service worker (offline)
  fonts/        Playfair Display, Cormorant Garamond, Syne (self-hosted, OFL)
  data/seed.json  herbaty startowe (generowane — nie edytuj ręcznie)
dane/           listy herbat do wczytania (import-*.json)
wiedza/         notatki książkowe (źródło treści Nauki)
scripts/        build.mjs (dane → app/data), ikony.mjs (render ikon)
tests/          test end-to-end
```

Plan etapów i decyzje: [PLAN.md](PLAN.md) · pomysły na później: [POMYSLY.md](POMYSLY.md) · zmiany: [CHANGELOG.md](CHANGELOG.md).
