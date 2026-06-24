import { KitchenType } from "@/types/enums";
import { generateFirestoreId } from "@/utils/helpers";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cloneOrderItemWithQuantity(item: OrderItem, quantity: number, id: string | undefined): OrderItem {
  const options = item.options?.length ? item.options.map((o) => ({ ...o })) : undefined;
  return { ...item, id, quantity, price: roundMoney2(item.price), ...(options ? { options } : {}) };
}

function optionPremiumSum(options: OrderItemOption[] | undefined): number {
  if (!options?.length) return 0;
  return options.reduce((acc, o) => acc + (o.price || 0) * Math.max(0, Number(o.quantity) || 0), 0);
}

function expandOptionQuantitiesToOnes(options: OrderItemOption[]): OrderItemOption[] {
  const out: OrderItemOption[] = [];
  for (const o of options) {
    const raw = Number(o.quantity);
    const n = Math.floor(raw);
    const count = Number.isFinite(raw) && n >= 1 ? n : 1;
    for (let i = 0; i < count; i++) out.push({ ...o, quantity: 1 });
  }
  return out;
}

function drinkNeedsFlavorSplitting(item: OrderItem): boolean {
  if (item.kitchenType !== KitchenType.Drink) return false;
  const opts = item.options ?? [];
  if (opts.length >= 2) return true;
  return opts.some((o) => Number(o.quantity) > 1);
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
    ...(options?.length ? { options: options.map((o) => ({ ...o })) } : {}),
  };
}

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

    if (drinkNeedsFlavorSplitting(item) && item.options?.length) {
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
          out.push(cloneOrderItemWithQuantityAndOptions(
            item, 1, [opt],
            hasLineId && emitted === 0 ? item.id : generateFirestoreId(),
            lineUnitPrice,
          ));
          emitted += 1;
        }
      }
      continue;
    }

    if (q === 1) { out.push(cloneOrderItemWithQuantity(item, 1, item.id)); continue; }

    const hasLineId = item.id != null && item.id !== "";
    for (let i = 0; i < q; i++) {
      out.push(cloneOrderItemWithQuantity(item, 1, hasLineId ? (i === 0 ? item.id : generateFirestoreId()) : generateFirestoreId()));
    }
  }

  return out;
}
