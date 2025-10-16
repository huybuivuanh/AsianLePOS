import { TableStatus } from "@/types/enum";
import { sortTables } from "@/utils/utils";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type TableStore = {
  tables: Table[];
  getTable: (tableNumber: string) => Table | undefined;

  // Local state updates
  setTableStatusLocal: (tableNumber: string, status: TableStatus) => void;
  setGuestsLocal: (tableNumber: string, guests: number) => void;

  // Firestore update
  updateTable: (tableNumber: string, data: Partial<Table>) => Promise<void>;

  subscribeToTables: () => Promise<() => void>;
  initializeTables: () => Promise<void>;
};

export const useTableStore = create<TableStore>((set, get) => ({
  tables: [],

  getTable: (tableNumber) =>
    get().tables.find((t) => t.tableNumber === tableNumber),

  // ✅ Local state only (no Firestore)
  setTableStatusLocal: (tableNumber, status) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.tableNumber === tableNumber ? { ...t, status } : t
      ),
    }));
  },

  setGuestsLocal: (tableNumber, guests) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.tableNumber === tableNumber ? { ...t, guests } : t
      ),
    }));
  },

  // ✅ Firestore update (called on Submit)
  updateTable: async (tableNumber, data) => {
    const tableRef = doc(db, "tables", tableNumber);
    await updateDoc(tableRef, data);
    set((state) => ({
      tables: state.tables.map((t) =>
        t.tableNumber === tableNumber ? { ...t, ...data } : t
      ),
    }));
  },

  initializeTables: async () => {
    const tablesRef = collection(db, "tables");
    const snapshot = await getDocs(tablesRef);
    if (snapshot.empty) {
      const batch: Promise<void>[] = [];
      for (let i = 1; i <= 15; i++) {
        const tableDoc = doc(db, "tables", i.toString());
        batch.push(
          setDoc(tableDoc, {
            tableNumber: i.toString(),
            status: TableStatus.Open,
            guests: 0,
            currentOrderId: undefined,
          })
        );
      }
      await Promise.all(batch);
      console.log("✅ Initialized 15 tables in Firestore");
    }
  },

  subscribeToTables: async () => {
    await get().initializeTables();
    const tablesRef = collection(db, "tables");
    const unsubscribe = onSnapshot(tablesRef, (snapshot) => {
      const tablesData: Table[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Table),
        tableNumber: doc.id,
      }));
      const sortedTables = sortTables(tablesData);
      set({ tables: sortedTables });
    });
    return unsubscribe;
  },
}));
