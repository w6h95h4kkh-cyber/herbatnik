// Cienka warstwa nad IndexedDB. Magazyny: herbaty, degustacje i meta (ustawienia wewnętrzne).
const NAZWA_BAZY = 'herbatnik';
const WERSJA_BAZY = 2;
export const MAGAZYNY = ['herbaty', 'degustacje'];

let bazaPromise = null;

function otworz() {
  if (bazaPromise) return bazaPromise;
  bazaPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAZWA_BAZY, WERSJA_BAZY);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('herbaty')) {
        db.createObjectStore('herbaty', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('degustacje')) {
        const s = db.createObjectStore('degustacje', { keyPath: 'id' });
        s.createIndex('herbataId', 'herbataId');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'klucz' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return bazaPromise;
}

function transakcja(magazyn, tryb, praca) {
  return otworz().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(magazyn, tryb);
    const wynik = praca(tx);
    tx.oncomplete = () => resolve(wynik && 'result' in wynik ? wynik.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function wszystkie(magazyn) {
  return transakcja(magazyn, 'readonly', tx => tx.objectStore(magazyn).getAll());
}

export function pobierz(magazyn, klucz) {
  return transakcja(magazyn, 'readonly', tx => tx.objectStore(magazyn).get(klucz));
}

export function zapisz(magazyn, obiekt) {
  return transakcja(magazyn, 'readwrite', tx => { tx.objectStore(magazyn).put(obiekt); });
}

export function zapiszWiele(magazyn, obiekty) {
  return transakcja(magazyn, 'readwrite', tx => {
    const s = tx.objectStore(magazyn);
    obiekty.forEach(o => s.put(o));
  });
}

export function usun(magazyn, ids) {
  return transakcja(magazyn, 'readwrite', tx => {
    const s = tx.objectStore(magazyn);
    [].concat(ids).forEach(id => s.delete(id));
  });
}

// Prośba o trwałe miejsce — chroni dane przed automatycznym czyszczeniem przez przeglądarkę.
export async function poprosOTrwalosc() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* bez znaczenia — dane i tak są zapisane */ }
  return false;
}
