export function sortCategoriesByOrder(
  categories: FoodCategory[]
): FoodCategory[] {
  return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Ids of option groups attached to a menu item (for pruning selection state, etc.). */
export function getMenuItemOptionGroupIdSet(
  item: Pick<MenuItem, "optionGroupIds">,
): Set<string> {
  return new Set(
    (item.optionGroupIds ?? []).map((ref) => String(ref.optionGroupId)),
  );
}

/**
 * Groups linked from `item.optionGroupIds`, sorted by each ref's `order`, then
 * array index when `order` ties.
 */
export function getItemOptionGroupsInDisplayOrder(
  item: Pick<MenuItem, "optionGroupIds">,
  optionGroups: OptionGroup[],
): OptionGroup[] {
  const byId = new Map<string, OptionGroup>();
  for (const g of optionGroups) {
    if (g.id != null) byId.set(String(g.id), g);
  }
  const entries: {
    group: OptionGroup;
    sortOrder: number;
    menuIndex: number;
  }[] = [];
  (item.optionGroupIds ?? []).forEach((ref, menuIndex) => {
    const g = byId.get(String(ref.optionGroupId));
    if (g) {
      entries.push({
        group: g,
        sortOrder: ref.order,
        menuIndex,
      });
    }
  });
  entries.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.menuIndex - b.menuIndex;
  });
  return entries.map((e) => e.group);
}

/** Append selected lines for one group: `group.optionIds` order first, then any extras. */
export function appendOrderItemOptionsForGroup(
  target: OrderItemOption[],
  group: OptionGroup,
  selectedByOptionId: Record<string, number> | undefined,
  allOptions: ItemOption[],
): void {
  if (!selectedByOptionId) return;
  const seen = new Set<string>();
  for (const optionId of group.optionIds ?? []) {
    const quantity = selectedByOptionId[optionId];
    if (quantity == null || quantity <= 0) continue;
    const option = allOptions.find((o) => o.id === optionId);
    if (option) {
      target.push({ name: option.name, price: option.price, quantity });
      seen.add(optionId);
    }
  }
  for (const [optionId, quantity] of Object.entries(selectedByOptionId)) {
    if (seen.has(optionId) || quantity <= 0) continue;
    const option = allOptions.find((o) => o.id === optionId);
    if (option) {
      target.push({ name: option.name, price: option.price, quantity });
    }
  }
}

/** Items belonging to the first category (by order field). */
export function getFirstCategoryItems(
  categories: FoodCategory[],
  menuItems: MenuItem[]
): MenuItem[] {
  const sorted = sortCategoriesByOrder(categories);
  if (!sorted.length) return [];
  const firstCat = sorted[0];
  const itemById = new Map<string, MenuItem>();
  for (const item of menuItems) {
    if (item.id != null) itemById.set(String(item.id), item);
  }
  const result: MenuItem[] = [];
  for (const rawId of firstCat.itemIds ?? []) {
    const item = itemById.get(String(rawId));
    if (item) result.push(item);
  }
  return result;
}

/** All visible items in category order. */
export function getVisibleMenuItemsInCategoryOrder(
  categories: FoodCategory[],
  menuItems: MenuItem[]
): MenuItem[] {
  const itemById = new Map<string, MenuItem>();
  for (const item of menuItems) {
    if (item.id != null) itemById.set(String(item.id), item);
  }

  const seen = new Set<string>();
  const ordered: MenuItem[] = [];

  for (const cat of sortCategoriesByOrder(categories)) {
    for (const rawId of cat.itemIds ?? []) {
      const id = String(rawId);
      if (seen.has(id)) continue;
      const item = itemById.get(id);
      if (item) {
        ordered.push(item);
        seen.add(id);
      }
    }
  }

  return ordered;
}
