const DB_NAME = "RookieClipDB";
const STORE_NAME = "projectData";
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper to deeply convert blob URLs -> blobs before saving
const convertBlobUrlsToBlobs = async (elements) => {
  return Promise.all(
    elements.map(async (el) => {
      if (el?.source?.startsWith("blob:")) {
        const res = await fetch(el.source);
        const blob = await res.blob();

        return {
          ...el,
          source: blob,
        };
      }
      return el;
    }),
  );
};

const convertBlobsToUrls = (elements) => {
  return elements.map((el) => {
    if (el?.source instanceof Blob) {
      return {
        ...el,
        source: URL.createObjectURL(el.source),
      };
    }
    return el;
  });
};

// ADD
// ADD
export const addToIndexedDB = async (elements, zooms, transitions, canvasBg, transcript, cursorTracks) => {
  const db = await openDB();

  // blob URL (session-only) -> element id (stable) BEFORE the URLs get replaced with blobs
  const cursorTracksByElement = {};
  for (const el of elements) {
    const track = cursorTracks?.[el.source];
    if (track) cursorTracksByElement[el.id] = track;
  }

  const processedElements = await convertBlobUrlsToBlobs(elements);

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.put({
    id: "project",
    elements: processedElements,
    zooms,
    transitions,
    canvasBg,
    transcript,
    cursorTracks: cursorTracksByElement, // keyed by element id now
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

// GET
export const getFromIndexedDB = async () => {
  const db = await openDB();

  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  const request = store.get("project");

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result;

      if (!result) {
        resolve({ elements: [], zooms: [], transitions: [], canvasBg: null, transcript:[], cursorTracks : {}});
        return;
      }

      // GET (inside request.onsuccess, replacing the final resolve)
      const elements = convertBlobsToUrls(result.elements);

      // element id -> the NEW blob url that was just created for that element
      const cursorTracks = {};
      for (const el of elements) {
        const track = result.cursorTracks?.[el.id];
        if (track) cursorTracks[el.source] = track;
      }

      resolve({
        elements,
        zooms: result.zooms || [],
        transitions: result.transitions || [],
        canvasBg: result.canvasBg || null,
        transcript: result.transcript || [],
        cursorTracks,
      });
    };

    request.onerror = () => reject(request.error);
  });
};

// CLEAR
export const clearIndexedDB = async () => {
  const db = await openDB();

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};
