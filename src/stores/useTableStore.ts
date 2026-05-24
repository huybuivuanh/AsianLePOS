import { sortTables } from "@/utils/helpers";
import { createStoreCache } from "@/utils/storeCache";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { create } from "zustand";
import { firebase } from "../lib/firebaseConfig";

const cache = createStoreCache<Table[]>("@tables:cache");

type TableStore = {
  tables: Table[];
  getTable: (tableNumber: string) => Table | undefined;
  /** Resolve Firestore doc id for a display/route `tableNumber`; undefined if not in cache. */
  getTableDocId: (tableNumber: string) => string | undefined;

  /** Firestore path `tables/{tableDocId}`. */
  updateTable: (tableDocId: string, data: Partial<Table>) => Promise<void>;

  subscribeToTables: () => Promise<() => void>;
  clearData: () => void;
};

export const useTableStore = create<TableStore>((set, get) => ({
  tables: [],

  getTable: (tableNumber) =>
    get().tables.find((t) => t.tableNumber === tableNumber),

  getTableDocId: (tableNumber) =>
    get().tables.find((t) => t.tableNumber === tableNumber)?.id,

  updateTable: async (tableDocId, data) => {
    const tableRef = doc(firebase.db, "tables", tableDocId);
    await updateDoc(tableRef, data);
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableDocId ? { ...t, ...data } : t,
      ),
    }));
  },

  subscribeToTables: async () => {
    // Serve cache immediately while waiting for first snapshot
    cache.load().then((cached) => {
      if (
        cached &&
        cached.length > 0 &&
        useTableStore.getState().tables.length === 0
      ) {
        set({ tables: cached });
      }
    });

    const tablesRef = collection(firebase.db, "tables");
    const unsubscribe = onSnapshot(tablesRef, (snapshot) => {
      const tablesData: Table[] = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data() as Partial<Table>;
        return {
          ...raw,
          id: docSnap.id,
          tableNumber: raw.tableNumber ?? docSnap.id,
        } as Table;
      });
      const sortedTables = sortTables(tablesData);
      set({ tables: sortedTables });
      void cache.save(sortedTables);
    });
    return unsubscribe;
  },

  clearData: () => {
    void cache.clear();
    set({ tables: [] });
  },
}));
