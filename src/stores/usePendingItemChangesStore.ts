import { create } from "zustand";

export function changeKey(c: ItemChange): string {
  return `${c.from}␟${c.to}`;
}

function without(list: ItemChange[], change: ItemChange): ItemChange[] {
  return list.filter((c) => changeKey(c) !== changeKey(change));
}

function has(list: ItemChange[], change: ItemChange): boolean {
  return list.some((c) => changeKey(c) === changeKey(change));
}

/**
 * Ephemeral bridge for the menu-changes picker to hand a diff of selected
 * changes back to item/[itemId].tsx across the navigation boundary — Expo
 * Router has no built-in way for a pushed screen to return a result.
 *
 * `additions` = changes newly picked this session (not previously on the item).
 * `removals` = changes that were already on the item, toggled off this session.
 * Both are keyed sets under the hood (toggling twice is a no-op), not queues.
 */
type PendingItemChangesState = {
  additions: ItemChange[];
  removals: ItemChange[];
  toggleAddition: (change: ItemChange) => void;
  toggleRemoval: (change: ItemChange) => void;
  consume: () => { additions: ItemChange[]; removals: ItemChange[] };
  clear: () => void;
};

export const usePendingItemChangesStore = create<PendingItemChangesState>((set, get) => ({
  additions: [],
  removals: [],

  toggleAddition: (change) =>
    set((state) => ({
      additions: has(state.additions, change)
        ? without(state.additions, change)
        : [...state.additions, change],
    })),

  toggleRemoval: (change) =>
    set((state) => ({
      removals: has(state.removals, change)
        ? without(state.removals, change)
        : [...state.removals, change],
    })),

  consume: () => {
    const { additions, removals } = get();
    set({ additions: [], removals: [] });
    return { additions, removals };
  },

  clear: () => set({ additions: [], removals: [] }),
}));
