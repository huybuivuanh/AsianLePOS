import { create } from "zustand";

export function extraKey(e: AddExtra): string {
  return `${e.description}␟${e.price}`;
}

function without(list: AddExtra[], extra: AddExtra): AddExtra[] {
  return list.filter((e) => extraKey(e) !== extraKey(extra));
}

function has(list: AddExtra[], extra: AddExtra): boolean {
  return list.some((e) => extraKey(e) === extraKey(extra));
}

/**
 * Ephemeral bridge for the add-extras picker to hand a diff of selected
 * extras back to item/[itemId].tsx across the navigation boundary — Expo
 * Router has no built-in way for a pushed screen to return a result.
 *
 * `additions` = extras newly picked this session (not previously on the item).
 * `removals` = extras that were already on the item, toggled off this session.
 * Both are keyed sets under the hood (toggling twice is a no-op), not queues.
 */
type PendingExtrasState = {
  additions: AddExtra[];
  removals: AddExtra[];
  toggleAddition: (extra: AddExtra) => void;
  toggleRemoval: (extra: AddExtra) => void;
  consume: () => { additions: AddExtra[]; removals: AddExtra[] };
  clear: () => void;
};

export const usePendingExtrasStore = create<PendingExtrasState>((set, get) => ({
  additions: [],
  removals: [],

  toggleAddition: (extra) =>
    set((state) => ({
      additions: has(state.additions, extra)
        ? without(state.additions, extra)
        : [...state.additions, extra],
    })),

  toggleRemoval: (extra) =>
    set((state) => ({
      removals: has(state.removals, extra)
        ? without(state.removals, extra)
        : [...state.removals, extra],
    })),

  consume: () => {
    const { additions, removals } = get();
    set({ additions: [], removals: [] });
    return { additions, removals };
  },

  clear: () => set({ additions: [], removals: [] }),
}));
