import { firebase } from "@/lib/firebaseConfig";
import { DiscountType, OrderStatus, OrderType, TableStatus } from "@/types/enums";
import { kitchenTypeSortRank } from "@/features/order/orderItemSections";
import { ungroupOrderItems } from "@/utils/groupOrderItems";
import { calculateTaxBreakdown, orderItemsSubtotal } from "@/utils/helpers";
import { normalizeOrderItemTextForDb } from "@/utils/normalizeOrderItemText";
import { doc, Timestamp, writeBatch } from "firebase/firestore";

function discountInputs(order: OrderDraft): { type: DiscountType; value: number } {
  const d = order.taxBreakDown?.discount;
  return { type: d?.discountType ?? DiscountType.None, value: d?.discountValue ?? 0 };
}

export async function submitOrder(order: OrderDraft, tableDocId?: string): Promise<void> {
  if (!order.id) throw new Error("Cannot submit order without ID.");
  if (!order.orderItems || order.orderItems.length === 0) throw new Error("Cannot submit empty order.");

  if (order.orderType === OrderType.TakeOut) {
    if (!order.customerName?.trim() && !order.phoneNumber?.trim()) throw new Error("Missing customer info.");
    if (!order.fulfillment) throw new Error("Missing fulfillment.");
  }

  const { type, value } = discountInputs(order);
  const taxBreakDown = calculateTaxBreakdown(orderItemsSubtotal(order.orderItems), type, value);

  const rawItems = ungroupOrderItems(order.orderItems ?? []).sort((a, b) => {
    const ra = kitchenTypeSortRank(a.kitchenType);
    const rb = kitchenTypeSortRank(b.kitchenType);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  const normalizedItems = rawItems.map(normalizeOrderItemTextForDb);

  const payload: Record<string, unknown> = {
    id: order.id,
    orderType: order.orderType,
    orderItems: normalizedItems,
    taxBreakDown,
    status: OrderStatus.InProgress,
    paid: false,
    printed: false,
    createdAt: Timestamp.fromDate(new Date()),
    staff: order.staff,
  };

  if (order.orderType === OrderType.TakeOut) {
    payload.customerName = order.customerName?.trim().toUpperCase() ?? null;
    payload.phoneNumber = order.phoneNumber ?? null;
    payload.fulfillment = order.fulfillment;
  } else {
    payload.tableNumber = order.tableNumber;
    payload.guests = order.guests;
  }

  const firestoreCollection = order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";
  const batch = writeBatch(firebase.db);
  batch.set(doc(firebase.db, firestoreCollection, order.id!), payload);

  if (order.orderType === OrderType.DineIn && tableDocId) {
    batch.update(doc(firebase.db, "tables", tableDocId), {
      status: TableStatus.Occupied,
      currentOrderId: order.id,
    });
  }

  await batch.commit();
}

export async function updateOrder(order: OrderDraft): Promise<void> {
  if (!order.id) throw new Error("Cannot update order without ID.");

  const firestoreCollection = order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";
  const { type, value } = discountInputs(order);
  const taxBreakDown = calculateTaxBreakdown(orderItemsSubtotal(order.orderItems), type, value);

  const rawItems = ungroupOrderItems(order.orderItems ?? []).sort((a, b) => {
    const ra = kitchenTypeSortRank(a.kitchenType);
    const rb = kitchenTypeSortRank(b.kitchenType);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  const cleanItems = rawItems.map((item) =>
    normalizeOrderItemTextForDb({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      togo: item.togo,
      appetizer: item.appetizer,
      kitchenType: item.kitchenType,
      paid: item.paid,
      completed: item.completed,
      options: item.options ?? [],
      extras: item.extras ?? [],
      changes: item.changes ?? [],
      ...(item.instructions && { instructions: item.instructions }),
    }),
  );

  const updateData: Record<string, unknown> = {
    id: order.id,
    orderType: order.orderType,
    orderItems: cleanItems,
    taxBreakDown,
    status: order.status,
    printed: order.printed ?? false,
    staff: order.staff,
    ...(order.createdAt && { createdAt: order.createdAt }),
  };

  if (order.orderType === OrderType.TakeOut) {
    if (order.customerName) updateData.customerName = order.customerName.trim().toUpperCase();
    if (order.phoneNumber) updateData.phoneNumber = order.phoneNumber;
    if (order.fulfillment) updateData.fulfillment = order.fulfillment;
  } else {
    if (order.tableNumber !== undefined) updateData.tableNumber = order.tableNumber;
    if (order.guests !== undefined) updateData.guests = order.guests;
  }

  const batch = writeBatch(firebase.db);
  batch.update(doc(firebase.db, firestoreCollection, order.id), updateData);
  await batch.commit();
}

export async function cancelOrder(order: OrderDraft, tableDocId?: string | null): Promise<void> {
  if (!order.id) throw new Error("Order ID is required to cancel.");

  const firestoreCollection = order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";
  const batch = writeBatch(firebase.db);
  batch.update(doc(firebase.db, firestoreCollection, order.id), { status: OrderStatus.Cancelled });

  if (order.orderType === OrderType.DineIn && tableDocId) {
    batch.update(doc(firebase.db, "tables", tableDocId), {
      status: TableStatus.Open,
      currentOrderId: null,
      guests: 0,
    });
  }

  await batch.commit();
}

export async function completeOrder(order: OrderDraft, tableDocId?: string | null): Promise<void> {
  if (!order.id) throw new Error("Order ID is required to complete.");

  const firestoreCollection = order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

  const nextStatus =
    order.status === OrderStatus.Cancelled
      ? OrderStatus.Completed
      : order.status === OrderStatus.Completed
        ? OrderStatus.InProgress
        : OrderStatus.Completed;

  const batch = writeBatch(firebase.db);
  batch.update(doc(firebase.db, firestoreCollection, order.id), { status: nextStatus });

  if (order.orderType === OrderType.DineIn && tableDocId && nextStatus === OrderStatus.Completed) {
    batch.update(doc(firebase.db, "tables", tableDocId), {
      status: TableStatus.Open,
      currentOrderId: null,
      guests: 0,
    });
  }

  await batch.commit();
}

/** Writes an already-mutated orderItems array to Firestore (used by paid-toggle debounce). */
export async function updateLineItemsPaid(orderId: string, items: OrderItem[]): Promise<void> {
  const batch = writeBatch(firebase.db);
  batch.update(doc(firebase.db, "dineInOrders", orderId), { orderItems: items });
  await batch.commit();
}

export async function markPaid(order: OrderDraft, paid: boolean): Promise<void> {
  if (!order.id) throw new Error("Order ID is required to mark as paid.");

  const firestoreCollection = order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";
  const nextItems = (order.orderItems ?? []).map((it) => ({ ...it, paid }));
  const batch = writeBatch(firebase.db);
  batch.update(doc(firebase.db, firestoreCollection, order.id), { orderItems: nextItems });
  await batch.commit();
}
