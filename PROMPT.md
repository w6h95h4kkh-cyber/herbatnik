# Prompt startowy — Herbatnik

Budujemy „Herbatnik" — moją prywatną aplikację herbacianą. Piszę po polsku, lubię konkret.

## Cel
Jedna aplikacja, trzy funkcje:
1. KOLEKCJA — moje herbaty (m.in. kalendarze adwentowe 2025: Mariage Frères, Kusmi, Palais des Thés — 71 herbat). Karta herbaty: nazwa, marka, typ (czarna/zielona/żółta/oolong/biała/ciemna-pu-erh/ziołowa), pochodzenie, aromaty, status (mam / wypita / chcę kupić).
2. DEGUSTACJE — szybki wpis: data, herbata, temperatura, czas parzenia, ocena 1–5, notatka smakowa. Historia i proste statystyki (ulubione typy, najwyżej oceniane).
3. NAUKA — baza wiedzy z `wiedza/` (hub + 11 notatek książkowych z Obsidiana: frontmatter YAML, callouty `> [!tip]`, wikilinki `[[...]]`).
   - Przeglądarka: nurty jak w hubie (wiedza/rzemiosło · rytuał · historia/kultura · reportaż).
   - Fiszki i quiz generowane z treści notatek — priorytet: Gebely (6/7 typów wg obróbki, chemia, parzenie) i Liu Tong (regiony, herbaty chińskie).
   - Karta herbaty z KOLEKCJI linkuje do wiedzy o jej typie (np. oolong → sekcja o wulong u Gebely'ego).
   - Treść quizu tylko z notatek w `wiedza/` — nie dopisuj faktów z wiedzy ogólnej.

## Technika
- PWA: działa w przeglądarce na telefonie, instalowalna, offline.
- Czysty HTML/CSS/JS lub lekki framework — bez backendu. Dane w IndexedDB + eksport/import JSON (backup).
- Treść nauki generowana skryptem z `wiedza/*.md` do JSON przy buildzie (obsłuż wikilinki i frontmatter YAML).
- Hosting: GitHub Pages.
- Estetyka: spokojna, botaniczna, jasna (jestem akwarelistką) — ma być ładnie, ale czytelnie.

## Zasady pracy
- Najpierw MVP: sama KOLEKCJA + DEGUSTACJE, działające end-to-end na telefonie. Dopiero potem NAUKA.
- Po każdym etapie: działająca wersja, commit, krótkie podsumowanie co zrobione / co dalej. Żadnych niedokończonych funkcji.
- Nie dodawaj funkcji, o które nie prosiłam. Pomysły zapisuj w `POMYSLY.md`.
- Prowadź `README.md` (jak uruchomić, jak dodać wiedzę) i `CHANGELOG.md`.
- Pytaj tylko, jeśli decyzja jest nieodwracalna; resztę rozstrzygaj sam i zapisz decyzję.
- Lekcja z porzuconego „habit dashboardu": upadł, bo miał kilkanaście modułów wymagających codziennych wpisów. Herbatnik NIE ma: XP, streaków, powiadomień, celów dziennych ani modułów spoza herbaty. Każdy wpis opcjonalny, dodanie degustacji max 3 tapnięcia.
- Lista „chcę kupić" — dopiszę później ręcznie.

Zacznij od: przejrzyj `wiedza/`, zaproponuj model danych i plan etapów (max 1 ekran), potem od razu buduj etap 1.
