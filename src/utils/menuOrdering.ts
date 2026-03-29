export function sortCategoriesByOrder(
  categories: FoodCategory[]
): FoodCategory[] {
  return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getMenuItemsForCategory(
  category: FoodCategory,
  menuItems: MenuItem[]
): MenuItem[] {
  const itemById = new Map<string, MenuItem>();
  for (const item of menuItems) {
    if (item.id != null) itemById.set(String(item.id), item);
  }
  const ordered: MenuItem[] = [];
  for (const rawId of category.itemIds ?? []) {
    const item = itemById.get(String(rawId));
    if (item) ordered.push(item);
  }
  return ordered;
}

/** All visible items in category order (for global search). */
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
