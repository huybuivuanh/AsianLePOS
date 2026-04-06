import { generateFirestoreId } from "./helpers";

/**
 * Merge order lines that share the same “signature” (name, price, kitchen, flags, options)
 * when they have no instructions, changes, or extras.
 * For display/print; do not blindly persist if you rely on per-line ids for edits.
 */

function hasInstructions(item: OrderItem): boolean {
  return Boolean(item.instructions?.trim());
}

function hasChanges(item: OrderItem): boolean {
  return Boolean(item.changes && item.changes.length > 0);
}

function hasExtras(item: OrderItem): boolean {
  return Boolean(item.extras && item.extras.length > 0);
}

/** Lines we may combine: nothing that makes the row unique beyond signature. */
function isGroupableOrderItem(item: OrderItem): boolean {
  if (hasInstructions(item)) return false;
  if (hasChanges(item)) return false;
  if (hasExtras(item)) return false;
  return true;
}

/** Stable key for options so order of options in the array does not matter. */
function normalizeOptionsKey(options: OrderItemOption[] | undefined): string {
  if (!options?.length) return "";
  const sorted = [...options].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    if (a.price !== b.price) return a.price - b.price;
    return a.quantity - b.quantity;
  });
  return JSON.stringify(
    sorted.map((o) => ({
      name: o.name,
      price: o.price,
      quantity: o.quantity,
    })),
  );
}

function mergeGroupKey(item: OrderItem): string {
  const parts = [
    item.name,
    String(item.price),
    item.kitchenType,
    item.togo ? "1" : "0",
    item.appetizer ? "1" : "0",
    item.paid ? "1" : "0",
    normalizeOptionsKey(item.options),
  ];
  return parts.join("\0");
}

function buildMergedLine(template: OrderItem, totalQuantity: number): OrderItem {
  const options =
    template.options && template.options.length > 0
      ? template.options.map((o) => ({ ...o }))
      : undefined;

  return {
    id: template.id,
    name: template.name,
    price: template.price,
    quantity: totalQuantity,
    kitchenType: template.kitchenType,
    togo: template.togo,
    appetizer: template.appetizer,
    paid: template.paid,
    ...(options ? { options } : {}),
  };
}

/**
 * Merges groupable rows that share the same **line signature**:
 * `name`, unit `price`, `kitchenType`, `togo`, `appetizer`, and the same **set of options**
 * (order-independent; compared by name, price, quantity per option).
 *
 * Not merged: rows with instructions, changes, or extras (each stays as its own line).
 *
 * - Quantities are summed for matching signatures (including when each row already has `quantity > 1`).
 * - Output order: first occurrence of a signature emits one merged row; later matches are skipped.
 */
export function groupSimpleOrderItems(items: OrderItem[]): OrderItem[] {
  if (items.length === 0) return [];

  const totalsByKey = new Map<string, number>();
  const templateByKey = new Map<string, OrderItem>();

  for (const item of items) {
    if (!isGroupableOrderItem(item)) continue;
    const key = mergeGroupKey(item);
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + item.quantity);
    if (!templateByKey.has(key)) {
      templateByKey.set(key, item);
    }
  }

  const emittedKeys = new Set<string>();
  const out: OrderItem[] = [];

  for (const item of items) {
    if (!isGroupableOrderItem(item)) {
      out.push(item);
      continue;
    }

    const key = mergeGroupKey(item);
    if (emittedKeys.has(key)) continue;
    emittedKeys.add(key);

    const template = templateByKey.get(key)!;
    const totalQty = totalsByKey.get(key)!;
    out.push(buildMergedLine(template, totalQty));
  }

  return out;
}

function cloneOrderItemWithQuantity(
  item: OrderItem,
  quantity: number,
  id: string | undefined,
): OrderItem {
  const options =
    item.options && item.options.length > 0
      ? item.options.map((o) => ({ ...o }))
      : undefined;

  return {
    ...item,
    id,
    quantity,
    ...(options ? { options } : {}),
  };
}

/**
 * Inverse of grouping on **quantity only**: each line with `quantity > 1` becomes that many
 * lines with `quantity: 1` (same name, price, options, flags, instructions, changes, extras).
 *
 * - **Order** is preserved: splits for a line are emitted in place, then the rest of the list.
 * - **Ids**: first split keeps `item.id` when it was set; additional splits get new Firestore ids.
 *   If the line had no `id`, every split gets a new id (safe for cart/edit).
 * - Non-finite or `quantity < 1`: one clone of the row is kept as-is (no drop).
 */
export function ungroupOrderItems(items: OrderItem[]): OrderItem[] {
  if (items.length === 0) return [];

  const out: OrderItem[] = [];

  for (const item of items) {
    const raw = Number(item.quantity);
    const q = Math.floor(raw);

    if (!Number.isFinite(raw) || q < 1) {
      out.push(cloneOrderItemWithQuantity(item, item.quantity, item.id));
      continue;
    }

    if (q === 1) {
      out.push(cloneOrderItemWithQuantity(item, 1, item.id));
      continue;
    }

    const hasLineId = item.id != null && item.id !== "";

    for (let i = 0; i < q; i++) {
      const id = hasLineId
        ? i === 0
          ? item.id
          : generateFirestoreId()
        : generateFirestoreId();
      out.push(cloneOrderItemWithQuantity(item, 1, id));
    }
  }

  return out;
}
