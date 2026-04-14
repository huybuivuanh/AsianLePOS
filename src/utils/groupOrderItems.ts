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
 * Drink-only: same base line (name, unit price, flags, paid) but **different** single flavor
 * options merge into one row: `quantity` becomes 1, line `price` = sum of line totals,
 * each flavor’s `OrderItemOption.quantity` accumulates `lineQty × optionQty`.
 */
function drinkFlavorBucketKey(item: OrderItem): string | null {
  if (item.kitchenType !== KitchenType.Drink) return null;
  if (!isGroupableOrderItem(item)) return null;
  if (!item.options || item.options.length !== 1) return null;
  return [
    item.name,
    String(roundMoney2(item.price)),
    item.kitchenType,
    item.togo ? "1" : "0",
    item.appetizer ? "1" : "0",
    item.paid ? "1" : "0",
  ].join("\0");
}

function buildMergedDrinkFlavorLine(bucket: OrderItem[]): OrderItem {
  const template = bucket[0];
  const flavorOrder: string[] = [];
  const seenFlavor = new Set<string>();
  const optionQtyByName = new Map<string, number>();
  const optionPriceByName = new Map<string, number>();

  let lineTotalSum = 0;
  for (const item of bucket) {
    const opt = item.options![0];
    const lineQty = Number(item.quantity);
    const safeLineQty = Number.isFinite(lineQty) ? lineQty : 0;
    lineTotalSum += roundMoney2(item.price) * safeLineQty;

    const rawOptQ = Number(opt.quantity);
    const optUnit =
      Number.isFinite(rawOptQ) && Math.floor(rawOptQ) >= 1
        ? Math.floor(rawOptQ)
        : 1;
    const add = safeLineQty * optUnit;
    const name = opt.name;
    optionQtyByName.set(name, (optionQtyByName.get(name) ?? 0) + add);
    if (!seenFlavor.has(name)) {
      seenFlavor.add(name);
      flavorOrder.push(name);
    }
    if (!optionPriceByName.has(name)) {
      optionPriceByName.set(name, roundMoney2(opt.price || 0));
    }
  }

  const options: OrderItemOption[] = flavorOrder.map((name) => ({
    name,
    price: optionPriceByName.get(name) ?? 0,
    quantity: optionQtyByName.get(name) ?? 0,
  }));

  return {
    id: template.id,
    name: template.name,
    price: roundMoney2(lineTotalSum),
    quantity: 1,
    kitchenType: template.kitchenType,
    togo: template.togo,
    appetizer: template.appetizer,
    paid: template.paid,
    options,
  };
}

/** Collapse multi-line same-base drinks (one option per line) before signature merge. */
function applyDrinkFlavorGrouping(items: OrderItem[]): OrderItem[] {
  const n = items.length;
  const indicesByKey = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const key = drinkFlavorBucketKey(items[i]);
    if (!key) continue;
    let list = indicesByKey.get(key);
    if (!list) {
      list = [];
      indicesByKey.set(key, list);
    }
    list.push(i);
  }

  const skip = new Set<number>();
  const replaceFirst = new Map<number, OrderItem>();

  for (const indices of indicesByKey.values()) {
    if (indices.length < 2) continue;
    const bucket = indices.map((i) => items[i]);
    replaceFirst.set(indices[0], buildMergedDrinkFlavorLine(bucket));
    for (let j = 1; j < indices.length; j++) {
      skip.add(indices[j]!);
    }
  }

  const out: OrderItem[] = [];
  for (let i = 0; i < n; i++) {
    if (skip.has(i)) continue;
    const merged = replaceFirst.get(i);
    if (merged) out.push(merged);
    else out.push(items[i]!);
  }
  return out;
}

function mergeByLineSignature(items: OrderItem[]): OrderItem[] {
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

/**
 * Merges groupable rows that share the same **line signature**:
 * `name`, unit `price`, `kitchenType`, `togo`, `appetizer`, and the same **set of options**
 * (order-independent; compared by name, price, quantity per option).
 *
 * **Drinks (kitchen Drink, exactly one option, no instructions/changes/extras):** lines that
 * share the same base key but differ only by that option’s name are merged first: one row
 * with `quantity: 1`, `price` = sum of prior line totals, and per-flavor option quantities
 * increased (e.g. three `2× Pop` / 7UP / Coke / Coke Zero → one `1× Pop` with three options).
 *
 * Not merged: rows with instructions, changes, or extras (each stays as its own line).
 *
 * - Quantities are summed for matching signatures (including when each row already has `quantity > 1`).
 * - Output order: first occurrence of a signature emits one merged row; later matches are skipped.
 */
export function groupSimpleOrderItems(items: OrderItem[]): OrderItem[] {
  if (items.length === 0) return [];
  return mergeByLineSignature(applyDrinkFlavorGrouping(items));
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
