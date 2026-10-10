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
export const addToIndexedDB = async (elements, zooms, transitions, canvasBg, transcript) => {
  const db = await openDB();
  console.log("transcript:", transcript)
  // ✅ do async stuff BEFORE transaction
  const processedElements = await convertBlobUrlsToBlobs(elements);

  // ✅ now start transaction
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.put({
    id: "project",
    elements: processedElements,
    zooms,
    transitions,
    canvasBg,
    transcript
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
        resolve({ elements: [], zooms: [], transitions: [], canvasBg: null, cursorData:[], transcript:[] });
        return;
      }

      resolve({
        elements: convertBlobsToUrls(result.elements),
        zooms: result.zooms || [],
        transitions: result.transitions || [],
        canvasBg: result.canvasBg || null,
        transcript: result.transcript || []
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
