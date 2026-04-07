import { sortTables } from "@/utils/helpers";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type TableStore = {
  tables: Table[];
  getTable: (tableNumber: string) => Table | undefined;

  // Firestore update
  updateTable: (tableNumber: string, data: Partial<Table>) => Promise<void>;

  subscribeToTables: () => Promise<() => void>;
  clearData: () => void;
};

export const useTableStore = create<TableStore>((set, get) => ({
  tables: [],

  getTable: (tableNumber) =>
    get().tables.find((t) => t.tableNumber === tableNumber),

  // ✅ Firestore update (called on Submit)
  updateTable: async (tableNumber, data) => {
    const tableRef = doc(db, "tables", tableNumber);
    await updateDoc(tableRef, data);
    set((state) => ({
      tables: state.tables.map((t) =>
        t.tableNumber === tableNumber ? { ...t, ...data } : t,
      ),
    }));
  },

  subscribeToTables: async () => {
    const tablesRef = collection(db, "tables");
    const unsubscribe = onSnapshot(tablesRef, (snapshot) => {
      const tablesData: Table[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Table),
        id: doc.id as string,
      }));
      const sortedTables = sortTables(tablesData);
      set({ tables: sortedTables });
    });
    return unsubscribe;
  },

  clearData: () => {
    set({ tables: [] });
  },
}));
