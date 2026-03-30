import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType, TakeOutFulfillmentKind } from "@/types/enums";
import { calculateTaxBreakdown, orderItemsSubtotal } from "@/utils/helpers";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { create } from "zustand";

/**
 * In-memory cart / Firestore write payload. Wider than `AnyOrder` because drafts are partial.
 */
type OrderDraft = Partial<Order> & {
  customerName?: string;
  phoneNumber?: string;
  fulfillment?: TakeOutFulfillment;
  tableNumber?: string;
  guests?: number;
};

type OrderState = {
  order: OrderDraft;

  updateOrder: (fields: OrderDraft) => void;
  addItem: (item: OrderItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearOrder: () => void;
  getTotalItems: () => number;
  getTaxBreakdown: () => TaxBreakDown | undefined;
  updateOrderItem: (itemId: string, fields: Partial<OrderItem>) => void;
  setOrder: (order: OrderDraft) => void;
  submitOrder: (order: OrderDraft) => Promise<void>;
  updateOrderOnFirestore: (order: OrderDraft) => Promise<void>;
  cancelOrder: (order: OrderDraft) => Promise<void>;
  completeOrder: (order: OrderDraft) => Promise<void>;
  markOrderAsPaid: (order: OrderDraft, paid: boolean) => Promise<void>;
  submitToPrintQueue: (order: OrderDraft) => Promise<void>;
  submitSelectedItemsToPrintQueue: (
    order: OrderDraft,
    selectedItemIds: string[]
  ) => Promise<void>;
};

const defaultTakeOutDraft: OrderDraft = {
  orderItems: [],
  orderType: OrderType.TakeOut,
  printed: false,
  fulfillment: {
    kind: TakeOutFulfillmentKind.Immediate,
    readyTimeMinutes: 15,
  },
};

function withRecalculatedTax(order: OrderDraft): OrderDraft {
  const subtotal = orderItemsSubtotal(order.orderItems);
  const taxBreakDown =
    subtotal > 0 ? calculateTaxBreakdown(subtotal) : undefined;
  return {
    ...order,
    taxBreakDown,
  };
}

function mergeOrderDraft(
  prev: OrderDraft,
  fields: OrderDraft
): OrderDraft {
  const cleanFields: OrderDraft = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) {
      (cleanFields as Record<string, unknown>)[key] = value;
    }
  });
  let merged: OrderDraft = { ...prev, ...cleanFields };

  if (cleanFields.orderType === OrderType.DineIn) {
    const m = { ...merged } as Record<string, unknown>;
    delete m.fulfillment;
    delete m.customerName;
    delete m.phoneNumber;
    merged = m as OrderDraft;
  }
  if (cleanFields.orderType === OrderType.TakeOut) {
    const m = { ...merged } as Record<string, unknown>;
    delete m.tableNumber;
    delete m.guests;
    merged = m as OrderDraft;
    if (!merged.fulfillment) {
      merged.fulfillment = {
        kind: TakeOutFulfillmentKind.Immediate,
        readyTimeMinutes: 15,
      };
    }
  }

  return withRecalculatedTax(merged);
}

export const useOrderStore = create<OrderState>((set, get) => ({
  order: { ...defaultTakeOutDraft },

  updateOrder: (fields) =>
    set((state) => ({
      order: mergeOrderDraft(state.order, fields),
    })),

  addItem: (item) =>
    set((state) => ({
      order: mergeOrderDraft(state.order, {
        orderItems: [...(state.order.orderItems ?? []), item],
      }),
    })),

  removeItem: (itemId) =>
    set((state) => ({
      order: mergeOrderDraft(state.order, {
        orderItems:
          state.order.orderItems?.filter((i) => i.id !== itemId) ?? [],
      }),
    })),

  updateQuantity: (itemId, quantity) => {
    const items = get().order.orderItems ?? [];
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set((state) => ({
      order: mergeOrderDraft(state.order, {
        orderItems: items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
        ),
      }),
    }));
  },

  clearOrder: () => {
    set({ order: { ...defaultTakeOutDraft } });
  },

  getTotalItems: () => {
    return (get().order.orderItems ?? []).reduce(
      (acc, item) => acc + item.quantity,
      0
    );
  },

  getTaxBreakdown: () => {
    const order = get().order;
    if (order.taxBreakDown) return order.taxBreakDown;
    const sub = orderItemsSubtotal(order.orderItems);
    return sub > 0 ? calculateTaxBreakdown(sub) : undefined;
  },

  updateOrderItem: (itemId: string, fields: Partial<OrderItem>) =>
    set((state) => {
      if (!state.order.orderItems || !Array.isArray(state.order.orderItems)) {
        return state;
      }

      const newOrderItems = state.order.orderItems.map((item) => {
        if (item.id === itemId) {
          const updatedItem: OrderItem = {
            id: item.id,
            name: fields.name ?? item.name,
            price: fields.price ?? item.price,
            quantity: fields.quantity ?? item.quantity,
            togo: fields.togo ?? item.togo,
            appetizer: fields.appetizer ?? item.appetizer,
            kitchenType: fields.kitchenType ?? item.kitchenType,
            ...(fields.instructions !== undefined
              ? fields.instructions.trim()
                ? { instructions: fields.instructions.trim() }
                : {}
              : item.instructions
                ? { instructions: item.instructions }
                : {}),
            options:
              fields.options !== undefined
                ? fields.options
                : (item.options ?? []),
            extras:
              fields.extras !== undefined ? fields.extras : (item.extras ?? []),
            changes:
              fields.changes !== undefined
                ? fields.changes
                : (item.changes ?? []),
          };
          return updatedItem;
        }
        return item;
      });

      return {
        order: mergeOrderDraft(state.order, { orderItems: newOrderItems }),
      };
    }),

  setOrder: (order) => {
    const o: OrderDraft = { ...order };
    if (o.orderType === OrderType.TakeOut && !o.fulfillment) {
      o.fulfillment = {
        kind: TakeOutFulfillmentKind.Immediate,
        readyTimeMinutes: 15,
      };
    }
    set({ order: withRecalculatedTax(o) });
  },

  submitOrder: async (order) => {
    if (!order.id) throw new Error("Cannot submit order without ID.");

    let firestorecollection = "takeOutOrders";
    if (order.orderType === OrderType.DineIn) {
      firestorecollection = "dineInOrders";
      if (!order.orderItems || order.orderItems.length === 0) {
        throw new Error("Cannot submit empty order.");
      }
    } else {
      if (!order.orderItems || order.orderItems.length === 0) {
        throw new Error("Cannot submit empty order.");
      }
      if (!order.customerName?.trim() && !order.phoneNumber?.trim()) {
        throw new Error("Missing customer info.");
      }
      if (!order.fulfillment) {
        throw new Error("Missing fulfillment.");
      }
    }

    const subtotal = orderItemsSubtotal(order.orderItems);
    const taxBreakDown = calculateTaxBreakdown(subtotal);

    const base = {
      id: order.id,
      orderType: order.orderType,
      orderItems: order.orderItems,
      taxBreakDown,
      status: OrderStatus.InProgress,
      paid: false,
      printed: false,
      createdAt: Timestamp.fromDate(new Date()),
      staff: order.staff,
    };

    const orderToSubmit: Record<string, unknown> = { ...base };

    if (order.orderType === OrderType.TakeOut) {
      orderToSubmit.customerName = order.customerName ?? null;
      orderToSubmit.phoneNumber = order.phoneNumber ?? null;
      orderToSubmit.fulfillment = order.fulfillment;
    } else {
      orderToSubmit.tableNumber = order.tableNumber;
      orderToSubmit.guests = order.guests;
    }

    const batch = writeBatch(db);
    batch.set(
      doc(db, firestorecollection, order.id!),
      orderToSubmit as Record<string, unknown>
    );
    batch.set(
      doc(db, "orderHistory", order.id!),
      orderToSubmit as Record<string, unknown>
    );
    await batch.commit();

    get().clearOrder();
  },

  updateOrderOnFirestore: async (order) => {
    if (!order.id) throw new Error("Cannot update order without ID.");

    const firestorecollection =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

    const subtotal = orderItemsSubtotal(order.orderItems);
    const taxBreakDown = calculateTaxBreakdown(subtotal);

    const cleanOrderItems = (order.orderItems ?? []).map((item) => {
      const cleanItem: OrderItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        togo: item.togo,
        appetizer: item.appetizer,
        kitchenType: item.kitchenType,
        options: item.options ?? [],
        extras: item.extras ?? [],
        changes: item.changes ?? [],
        ...(item.instructions && { instructions: item.instructions }),
      };
      return cleanItem;
    });

    const updateData: Record<string, unknown> = {
      id: order.id,
      orderType: order.orderType,
      orderItems: cleanOrderItems,
      taxBreakDown,
      status: order.status,
      paid: order.paid ?? false,
      printed: order.printed ?? false,
      staff: order.staff,
      ...(order.createdAt && { createdAt: order.createdAt }),
    };

    if (order.orderType === OrderType.TakeOut) {
      if (order.customerName) updateData.customerName = order.customerName;
      if (order.phoneNumber) updateData.phoneNumber = order.phoneNumber;
      if (order.fulfillment) updateData.fulfillment = order.fulfillment;
    } else {
      if (order.tableNumber !== undefined) {
        updateData.tableNumber = order.tableNumber;
      }
      if (order.guests !== undefined) updateData.guests = order.guests;
    }

    const batch = writeBatch(db);
    const orderRef = doc(db, firestorecollection, order.id);
    batch.update(orderRef, updateData);
    const historyRef = doc(db, "orderHistory", order.id);
    batch.update(historyRef, updateData);
    await batch.commit();
  },

  cancelOrder: async (order: OrderDraft) => {
    if (!order.id) throw new Error("Order ID is required to cancel.");

    let firestorecollection = "takeOutOrders";
    if (order.orderType === OrderType.DineIn) {
      firestorecollection = "dineInOrders";
    }

    const batch = writeBatch(db);
    const orderRef = doc(db, firestorecollection, order.id);
    batch.delete(orderRef);
    const orderHistoryRef = doc(db, "orderHistory", order.id);
    batch.update(orderHistoryRef, {
      status: OrderStatus.Canceled,
    });
    await batch.commit();
  },

  completeOrder: async (order: OrderDraft) => {
    if (!order.id) throw new Error("Order ID is required to complete.");

    let firestorecollection = "takeOutOrders";
    if (order.orderType === OrderType.DineIn) {
      firestorecollection = "dineInOrders";
    }

    const batch = writeBatch(db);
    const orderRef = doc(db, firestorecollection, order.id);
    batch.delete(orderRef);
    const orderHistoryRef = doc(db, "orderHistory", order.id);
    batch.update(orderHistoryRef, {
      status: OrderStatus.Completed,
      paid: true,
    });
    await batch.commit();
  },

  markOrderAsPaid: async (order: OrderDraft, paid: boolean) => {
    if (!order.id) throw new Error("Order ID is required to mark as paid.");

    const firestorecollection =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

    const batch = writeBatch(db);
    const orderRef = doc(db, firestorecollection, order.id);
    batch.update(orderRef, { paid });
    const historyRef = doc(db, "orderHistory", order.id);
    batch.update(historyRef, { paid });
    await batch.commit();
  },

  submitToPrintQueue: async (order: OrderDraft) => {
    if (!order.id) throw new Error("Order ID is required to print.");
    const printQueueRef = doc(collection(db, "printQueue"));
    await setDoc(printQueueRef, order as Record<string, unknown>);
  },

  submitSelectedItemsToPrintQueue: async (
    order: OrderDraft,
    selectedItemIds: string[]
  ) => {
    if (!order.id) throw new Error("Order ID is required to print.");
    if (selectedItemIds.length === 0) {
      throw new Error("At least one item must be selected.");
    }

    const selectedItems =
      order.orderItems?.filter((item) =>
        item.id ? selectedItemIds.includes(item.id) : false
      ) || [];

    const selectedSubtotal = selectedItems.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );
    const selectedTaxBreakDown = calculateTaxBreakdown(selectedSubtotal);

    const partialOrder: OrderDraft = {
      ...order,
      orderItems: selectedItems,
      taxBreakDown: selectedTaxBreakDown,
    };

    const printQueueRef = doc(collection(db, "printQueue"));
    await setDoc(printQueueRef, partialOrder as Record<string, unknown>);
  },
}));
