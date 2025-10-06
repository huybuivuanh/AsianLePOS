import { collection, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "../lib/firebaseConfig";

type MenuState = {
  categories: FoodCategory[];
  menuItems: MenuItem[];
  optionGroups: OptionGroup[];
  options: ItemOption[];
  loading: boolean;
  subscribeToMenu: () => () => void;
};

export const useMenuStore = create<MenuState>((set) => ({
  categories: [],
  menuItems: [],
  optionGroups: [],
  options: [],
  loading: true,

  subscribeToMenu: () => {
    const unsubscribers: (() => void)[] = [];

    // Categories
    unsubscribers.push(
      onSnapshot(collection(db, "categories"), (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FoodCategory[];
        set({
          categories: data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
          loading: false,
        });
      })
    );

    // Menu Items
    unsubscribers.push(
      onSnapshot(collection(db, "menuItems"), (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MenuItem[];
        set({ menuItems: data });
      })
    );

    // Option Groups
    unsubscribers.push(
      onSnapshot(collection(db, "optionGroups"), (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as OptionGroup[];
        set({ optionGroups: data });
      })
    );

    // Options
    unsubscribers.push(
      onSnapshot(collection(db, "options"), (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ItemOption[];
        set({ options: data });
      })
    );

    // Cleanup
    return () => unsubscribers.forEach((unsub) => unsub());
  },
}));
