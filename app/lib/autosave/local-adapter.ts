import { type SeatingPersistenceAdapter, type SeatingSnapshot } from "./types";

const STORAGE_KEY = "wedding_seating_v14";

export const localAdapter: SeatingPersistenceAdapter = {
  async save(snapshot: SeatingSnapshot): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      throw new Error("Failed to save to localStorage");
    }
  },

  async load(): Promise<SeatingSnapshot | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SeatingSnapshot;
    } catch {
      return null;
    }
  },
};