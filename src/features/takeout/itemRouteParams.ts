export type ItemMenuEntry = "search" | "category";

/** Params for `/item/[itemId]` — omits `menuEntry` when not needed (e.g. takeout). */
export type BuiltItemScreenParams = {
  itemId: string;
  orderType: string;
  menuEntry?: string;
  orderItemId?: string;
};

export function buildItemScreenParams(
  item: MenuItem,
  options: {
    orderType: string;
    menuEntry?: ItemMenuEntry;
    /** Existing line id when editing from the order review screen */
    orderItemId?: string;
  }
): BuiltItemScreenParams {
  const base: BuiltItemScreenParams = {
    itemId: item.id!,
    orderType: options.orderType,
  };
  if (options.menuEntry) {
    base.menuEntry = options.menuEntry;
  }
  if (options.orderItemId) {
    base.orderItemId = options.orderItemId;
  }
  return base;
}
