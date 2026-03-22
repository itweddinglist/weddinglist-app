export type SeatingSnapshot = {
  version: 1;
  guests: Array<{
    id: number;
    prenume: string;
    nume: string;
    grup: string;
    status: string;
    meniu: string;
    tableId: number | null;
  }>;
  tables: Array<{
    id: number;
    name: string;
    type: string;
    seats: number;
    x: number;
    y: number;
    rotation: number;
  }>;
  nextId: number;
  cam: { vx: number; vy: number; z: number };
  updatedAtClient: string;
};

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface SeatingPersistenceAdapter {
  save(snapshot: SeatingSnapshot): Promise<void>;
  load(): Promise<SeatingSnapshot | null>;
}