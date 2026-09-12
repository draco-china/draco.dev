import { type MusicData, validMusic } from "./model";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("music", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readMusic(): Promise<MusicData> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("data");
      const request = tx.objectStore("data").get("library");
      request.onsuccess = () => resolve(validMusic(request.result));
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function saveMusic(value: MusicData): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("data", "readwrite");
      tx.objectStore("data").put(
        JSON.parse(JSON.stringify(validMusic(value))),
        "library",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
