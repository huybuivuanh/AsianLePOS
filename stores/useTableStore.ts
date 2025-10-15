import { create } from "zustand";

type TableStore = {
  tables: Table[];
  addTable: (table: Table) => void;
  updateTable: (tableNumber: string, fields: Partial<Table>) => void;
  removeTable: (tableNumber: string) => void;
  getTable: (tableNumber: string) => Table | undefined;
};

export const useTableStore = create<TableStore>((set, get) => ({
  tables: Array.from({ length: 15 }, (_, i) => ({
    tableNumber: (i + 1).toString(),
    status: "Open",
    guests: 0,
  })),

  addTable: (table) =>
    set((state) => ({
      tables: [...state.tables, table],
    })),

  updateTable: (tableNumber, fields) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.tableNumber === tableNumber ? { ...t, ...fields } : t
      ),
    })),

  removeTable: (tableNumber) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.tableNumber !== tableNumber),
    })),

  getTable: (tableNumber) =>
    get().tables.find((t) => t.tableNumber === tableNumber),
}));
