/**
 * Shared ordering for dine-in style line items (appetizer / table / to-go flags).
 * Use with `groupOrderItemsByDisplaySection` for UI; print server can import the same helpers.
 */

export type OrderItemDisplayTier = 0 | 1 | 2;

const SECTION_TITLES: Record<OrderItemDisplayTier, string> = {
  0: "Appetizers",
  1: "For Table",
  2: "To Go",
};

/** Appetizers first, then table, then to-go. Appetizer wins if both flags are set. */
export function dineInItemSortTier(item: OrderItem): OrderItemDisplayTier {
  if (item.appetizer) return 0;
  if (item.togo) return 2;
  return 1;
}

export function sortOrderItemsForDisplay(items: OrderItem[]): OrderItem[] {
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const ta = dineInItemSortTier(a.item);
    const tb = dineInItemSortTier(b.item);
    if (ta !== tb) return ta - tb;
    return a.index - b.index;
  });
  return indexed.map(({ item }) => item);
}

export type OrderItemDisplaySection = {
  tier: OrderItemDisplayTier;
  title: string;
  items: OrderItem[];
};

/** Sorted items split into non-empty sections with labels. */
export function groupOrderItemsByDisplaySection(
  items: OrderItem[],
): OrderItemDisplaySection[] {
  const sorted = sortOrderItemsForDisplay(items);
  if (sorted.length === 0) return [];

  const sections: OrderItemDisplaySection[] = [];
  for (const item of sorted) {
    const tier = dineInItemSortTier(item);
    const last = sections[sections.length - 1];
    if (!last || last.tier !== tier) {
      sections.push({
        tier,
        title: SECTION_TITLES[tier],
        items: [item],
      });
    } else {
      last.items.push(item);
    }
  }
  return sections;
}
