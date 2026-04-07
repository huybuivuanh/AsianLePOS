import { KitchenType } from "@/types/enums";
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
    String(roundMoney2(item.price)),
    item.kitchenType,
    item.togo ? "1" : "0",
    item.appetizer ? "1" : "0",
    item.paid ? "1" : "0",
    normalizeOptionsKey(item.options),
  ];
  return parts.join("\0");
}

function buildMergedLine(
  template: OrderItem,
  totalQuantity: number,
): OrderItem {
  const options =
    template.options && template.options.length > 0
      ? template.options.map((o) => ({ ...o }))
      : undefined;

  return {
    id: template.id,
    name: template.name,
    price: roundMoney2(template.price),
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
    price: roundMoney2(item.price),
    ...(options ? { options } : {}),
  };
}

/** Matches `item/[itemId].tsx`: sum of option premiums on the line. */
function optionPremiumSum(options: OrderItemOption[] | undefined): number {
  if (!options?.length) return 0;
  return options.reduce(
    (acc, o) => acc + (o.price || 0) * Math.max(0, Number(o.quantity) || 0),
    0,
  );
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Each option becomes `max(1, floor(qty))` entries with `quantity: 1`, preserving option order. */
function expandOptionQuantitiesToOnes(
  options: OrderItemOption[],
): OrderItemOption[] {
  const out: OrderItemOption[] = [];
  for (const o of options) {
    const raw = Number(o.quantity);
    const n = Math.floor(raw);
    const count = Number.isFinite(raw) && n >= 1 ? n : 1;
    for (let i = 0; i < count; i++) {
      out.push({ ...o, quantity: 1 });
    }
  }
  return out;
}

function drinkNeedsOptionQuantityUngroup(item: OrderItem): boolean {
  return (
    item.kitchenType === KitchenType.Drink &&
    Boolean(item.options?.some((o) => Number(o.quantity) > 1))
  );
}

function cloneOrderItemWithQuantityAndOptions(
  item: OrderItem,
  quantity: number,
  options: OrderItemOption[] | undefined,
  id: string | undefined,
  unitPrice?: number,
): OrderItem {
  const nextPrice = unitPrice !== undefined ? unitPrice : item.price;
  return {
    ...item,
    id,
    quantity,
    price: roundMoney2(nextPrice),
    ...(options && options.length > 0
      ? { options: options.map((o) => ({ ...o })) }
      : {}),
  };
}

/**
 * Inverse of grouping on **quantity only**: each line with `quantity > 1` becomes that many
 * lines with `quantity: 1` (same name, price, options, flags, instructions, changes, extras).
 *
 * **Drink + option quantity > 1:** first expand each option into `quantity` copies with
 * `quantity: 1` (order preserved). Then emit `lineQuantity × expandedOptions.length` rows:
 * for each expanded option in order, repeat `lineQuantity` times with that single option
 * (e.g. 2× pop, [1× pepsi, 2× coke] → 2× pepsi, 4× coke lines → 6 rows).
 * **Unit price** on each split row: `(item.price − Σ option premiums) / expandedSlots + that
 * option’s unit price`, so line subtotals match `quantity × item.price` (menu + extras + changes
 * share the non-option remainder evenly per option slot).
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

    if (drinkNeedsOptionQuantityUngroup(item) && item.options?.length) {
      const expanded = expandOptionQuantitiesToOnes(item.options);
      const n = expanded.length;
      const origPrem = optionPremiumSum(item.options);
      const remainder = item.price - origPrem;
      const perSlotBase = n > 0 ? remainder / n : item.price;
      const hasLineId = item.id != null && item.id !== "";
      let emitted = 0;
      for (const opt of expanded) {
        const lineUnitPrice = roundMoney2(perSlotBase + (opt.price || 0));
        for (let i = 0; i < q; i++) {
          const id =
            hasLineId && emitted === 0 ? item.id : generateFirestoreId();
          emitted += 1;
          out.push(
            cloneOrderItemWithQuantityAndOptions(
              item,
              1,
              [opt],
              id,
              lineUnitPrice,
            ),
          );
        }
      }
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
