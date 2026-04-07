import { db } from "@/lib/firebaseConfig";
import {
  DiscountType,
  OrderStatus,
  OrderType,
  TableStatus,
  TakeOutFulfillmentKind,
} from "@/types/enums";
import {
  groupSimpleOrderItems,
  ungroupOrderItems,
} from "@/utils/groupOrderItems";
import {
  calculateTaxBreakdown,
  orderItemsSubtotal,
  orderPaidFromLineItems,
} from "@/utils/helpers";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { useTableStore } from "@/stores/useTableStore";
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
    selectedItemIds: string[],
  ) => Promise<void>;
  /** Atomically move a dine-in order to another table and update guest count. */
  changeDineInOrderTable: (args: {
    orderId: string;
    fromTableNumber: string;
    toTableNumber: string;
  }) => Promise<void>;
  /**
   * Move an in-progress dine-in order to `takeOutOrders`, clear the table row,
   * and remove the dine-in document (same order id).
   */
  convertDineInOrderToTakeOut: (args: {
    orderId: string;
    tableNumber: string;
    customerName?: string;
    phoneNumber?: string;
    fulfillment: TakeOutFulfillment;
  }) => Promise<void>;
  /**
   * Move an in-progress take-out order to `dineInOrders`, assign a table,
   * and remove the take-out document (same order id).
   */
  convertTakeOutOrderToDineIn: (args: {
    orderId: string;
    tableNumber: string;
    guests: number;
  }) => Promise<void>;
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

function discountInputsFromOrder(order: OrderDraft): {
  type: DiscountType;
  value: number;
} {
  const d = order.taxBreakDown?.discount;
  return {
    type: d?.discountType ?? DiscountType.None,
    value: d?.discountValue ?? 0,
  };
}

function withRecalculatedTax(order: OrderDraft): OrderDraft {
  const itemsSubtotal = orderItemsSubtotal(order.orderItems);
  const { type, value } = discountInputsFromOrder(order);

  const taxBreakDown =
    itemsSubtotal > 0
      ? calculateTaxBreakdown(itemsSubtotal, type, value)
      : undefined;
  return {
    ...order,
    taxBreakDown,
  };
}

function mergeOrderDraft(prev: OrderDraft, fields: OrderDraft): OrderDraft {
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
          i.id === itemId ? { ...i, quantity } : i,
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
      0,
    );
  },

  getTaxBreakdown: () => {
    const order = get().order;
    if (order.taxBreakDown) return order.taxBreakDown;
    const itemsSubtotal = orderItemsSubtotal(order.orderItems);
    return itemsSubtotal > 0
      ? calculateTaxBreakdown(itemsSubtotal, DiscountType.None, 0)
      : undefined;
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
            paid: fields.paid ?? item.paid ?? false,
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

    const itemsSubtotal = orderItemsSubtotal(order.orderItems);
    const { type, value } = discountInputsFromOrder(order);
    const taxBreakDown = calculateTaxBreakdown(itemsSubtotal, type, value);

    const itemsForFirestore =
      order.orderType === OrderType.DineIn
        ? ungroupOrderItems(order.orderItems ?? [])
        : groupSimpleOrderItems(order.orderItems ?? []);

    const base = {
      id: order.id,
      orderType: order.orderType,
      orderItems: itemsForFirestore,
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
      orderToSubmit as Record<string, unknown>,
    );
    await batch.commit();

    get().clearOrder();
  },

  updateOrderOnFirestore: async (order) => {
    if (!order.id) throw new Error("Cannot update order without ID.");

    const firestorecollection =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

    const itemsSubtotal = orderItemsSubtotal(order.orderItems);
    const { type, value } = discountInputsFromOrder(order);
    const taxBreakDown = calculateTaxBreakdown(itemsSubtotal, type, value);

    const rawItems =
      order.orderType === OrderType.DineIn
        ? ungroupOrderItems(order.orderItems ?? [])
        : (order.orderItems ?? []);

    const cleanOrderItems = rawItems.map((item) => {
      const cleanItem: OrderItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        togo: item.togo,
        appetizer: item.appetizer,
        kitchenType: item.kitchenType,
        paid: item.paid ?? false,
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
      paid:
        order.orderType === OrderType.DineIn
          ? orderPaidFromLineItems(cleanOrderItems)
          : (order.paid ?? false),
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
    batch.update(orderRef, {
      status: OrderStatus.Cancelled,
    });

    if (order.orderType === OrderType.DineIn && order.tableNumber) {
      const tableDocId = useTableStore
        .getState()
        .getTableDocId(order.tableNumber);
      if (!tableDocId) {
        throw new Error(
          "Cannot find table in app. Open the Tables tab to sync, then try again.",
        );
      }
      const tableRef = doc(db, "tables", tableDocId);
      batch.update(tableRef, {
        status: TableStatus.Open,
        currentOrderId: null,
        guests: 0,
      });
    }

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
    batch.update(orderRef, {
      status: OrderStatus.Completed,
    });

    if (order.orderType === OrderType.DineIn && order.tableNumber) {
      const tableDocId = useTableStore
        .getState()
        .getTableDocId(order.tableNumber);
      if (!tableDocId) {
        throw new Error(
          "Cannot find table in app. Open the Tables tab to sync, then try again.",
        );
      }
      const tableRef = doc(db, "tables", tableDocId);
      batch.update(tableRef, {
        status: TableStatus.Open,
        currentOrderId: null,
        guests: 0,
      });
    }

    await batch.commit();
  },

  markOrderAsPaid: async (order: OrderDraft, paid: boolean) => {
    if (!order.id) throw new Error("Order ID is required to mark as paid.");

    const firestorecollection =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

    const batch = writeBatch(db);
    const orderRef = doc(db, firestorecollection, order.id);
    batch.update(orderRef, { paid });
    await batch.commit();
  },

  submitToPrintQueue: async (order: OrderDraft) => {
    if (!order.id) throw new Error("Order ID is required to print.");
    const printQueueRef = doc(collection(db, "printQueue"));
    const forPrint: OrderDraft = {
      ...order,
      orderItems: groupSimpleOrderItems(order.orderItems ?? []),
    };
    await setDoc(printQueueRef, forPrint as Record<string, unknown>);
  },

  submitSelectedItemsToPrintQueue: async (
    order: OrderDraft,
    selectedItemIds: string[],
  ) => {
    if (!order.id) throw new Error("Order ID is required to print.");
    if (selectedItemIds.length === 0) {
      throw new Error("At least one item must be selected.");
    }

    const selectedItems =
      order.orderItems?.filter((item) =>
        item.id ? selectedItemIds.includes(item.id) : false,
      ) || [];

    const selectedSubtotal = selectedItems.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0,
    );
    const selectedTaxBreakDown = calculateTaxBreakdown(
      selectedSubtotal,
      DiscountType.None,
      0,
    );

    const partialOrder: OrderDraft = {
      ...order,
      orderItems: groupSimpleOrderItems(selectedItems),
      taxBreakDown: selectedTaxBreakDown,
    };

    const printQueueRef = doc(collection(db, "printQueue"));
    await setDoc(printQueueRef, partialOrder as Record<string, unknown>);
  },

  changeDineInOrderTable: async ({
    orderId,
    fromTableNumber,
    toTableNumber,
  }) => {
    if (!orderId) throw new Error("Order ID is required.");
    if (fromTableNumber === toTableNumber) {
      throw new Error("Select a different table.");
    }

    const orderRef = doc(db, "dineInOrders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Order not found.");
    }
    const orderData = orderSnap.data() as {
      tableNumber?: string;
      guests?: number;
    };
    const actualFrom = orderData.tableNumber;
    if (!actualFrom) {
      throw new Error("Order has no table.");
    }

    const rawGuests = Math.floor(Number(orderData.guests ?? 0));
    const g = rawGuests >= 1 ? rawGuests : 1;

    const fromDocId = useTableStore.getState().getTableDocId(actualFrom);
    const toDocId = useTableStore.getState().getTableDocId(toTableNumber);
    if (!fromDocId || !toDocId) {
      throw new Error(
        "Cannot find table in app. Open the Tables tab to sync, then try again.",
      );
    }

    const oldTableRef = doc(db, "tables", fromDocId);
    const newTableRef = doc(db, "tables", toDocId);

    const [oldTableSnap, newTableSnap] = await Promise.all([
      getDoc(oldTableRef),
      getDoc(newTableRef),
    ]);

    if (!oldTableSnap.exists() || !newTableSnap.exists()) {
      throw new Error("Table not found.");
    }

    const oldT = {
      ...(oldTableSnap.data() as Table),
      id: oldTableSnap.id,
    };
    const newT = {
      ...(newTableSnap.data() as Table),
      id: newTableSnap.id,
    };

    if (oldT.currentOrderId !== orderId) {
      throw new Error(
        "This order is no longer on the original table. Go back and refresh.",
      );
    }
    if (newT.status !== TableStatus.Open) {
      throw new Error("That table is not available. Choose another.");
    }

    const batch = writeBatch(db);

    batch.update(oldTableRef, {
      status: TableStatus.Open,
      currentOrderId: null,
      guests: 0,
    });
    batch.update(newTableRef, {
      status: TableStatus.Occupied,
      currentOrderId: orderId,
      guests: g,
    });
    batch.update(orderRef, {
      tableNumber: toTableNumber,
      guests: g,
    });

    await batch.commit();
  },

  convertDineInOrderToTakeOut: async ({
    orderId,
    tableNumber,
    customerName,
    phoneNumber,
    fulfillment,
  }) => {
    const name = customerName?.trim() ?? "";
    const phone = phoneNumber?.trim() ?? "";
    if (!name && !phone) {
      throw new Error("Enter a customer name or phone number.");
    }

    const orderRef = doc(db, "dineInOrders", orderId);
    const tableDocId = useTableStore.getState().getTableDocId(tableNumber);
    if (!tableDocId) {
      throw new Error(
        "Cannot find table in app. Open the Tables tab to sync, then try again.",
      );
    }
    const tableRef = doc(db, "tables", tableDocId);

    const [orderSnap, tableSnap] = await Promise.all([
      getDoc(orderRef),
      getDoc(tableRef),
    ]);

    if (!orderSnap.exists()) {
      throw new Error("Dine-in order not found.");
    }
    if (!tableSnap.exists()) {
      throw new Error("Table not found.");
    }

    const data = orderSnap.data() as Record<string, unknown> & {
      orderType?: string;
      tableNumber?: string;
      status?: OrderStatus;
      staff?: string;
      orderItems?: OrderItem[];
      taxBreakDown?: TaxBreakDown;
      paid?: boolean;
      printed?: boolean;
      createdAt?: Timestamp;
    };

    if (data.orderType !== OrderType.DineIn) {
      throw new Error("This order is not dine-in.");
    }
    if (data.status !== OrderStatus.InProgress) {
      throw new Error("Only in-progress orders can be converted.");
    }
    if (data.tableNumber !== tableNumber) {
      throw new Error("Order is not on this table.");
    }

    const tableData: Table = {
      ...(tableSnap.data() as Table),
      id: tableSnap.id,
    };
    if (tableData.currentOrderId !== orderId) {
      throw new Error("This order is no longer on this table.");
    }

    const draft = get().order;
    if (draft.id !== orderId) {
      throw new Error(
        "Order was replaced in the editor. Go back and try again.",
      );
    }

    const orderItems = draft.orderItems ?? [];
    if (orderItems.length === 0) {
      throw new Error("Cannot convert an empty order.");
    }

    const itemsSubtotal = orderItemsSubtotal(orderItems);
    const { type: discountType, value: discountValue } =
      discountInputsFromOrder(draft);
    const taxBreakDown = calculateTaxBreakdown(
      itemsSubtotal,
      discountType,
      discountValue,
    );

    const cleanOrderItems = orderItems.map((item) => {
      const cleanItem: OrderItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        togo: item.togo,
        appetizer: item.appetizer,
        kitchenType: item.kitchenType,
        paid: item.paid ?? false,
        options: item.options ?? [],
        extras: item.extras ?? [],
        changes: item.changes ?? [],
        ...(item.instructions && { instructions: item.instructions }),
      };
      return cleanItem;
    });

    const takeOutPayload: Record<string, unknown> = {
      id: orderId,
      orderType: OrderType.TakeOut,
      staff: data.staff ?? "",
      orderItems: groupSimpleOrderItems(cleanOrderItems),
      taxBreakDown,
      status: OrderStatus.InProgress,
      paid: data.paid ?? false,
      printed: data.printed ?? false,
      createdAt: data.createdAt,
      customerName: name || null,
      phoneNumber: phone || null,
      fulfillment,
    };

    const batch = writeBatch(db);
    batch.delete(orderRef);
    batch.set(doc(db, "takeOutOrders", orderId), takeOutPayload);
    batch.update(tableRef, {
      status: TableStatus.Open,
      currentOrderId: null,
      guests: 0,
    });

    await batch.commit();
    get().clearOrder();
  },

  convertTakeOutOrderToDineIn: async ({ orderId, tableNumber, guests }) => {
    const g = Math.floor(Number(guests));
    if (!Number.isFinite(g) || g < 1) {
      throw new Error("Enter at least one guest.");
    }

    const takeOutRef = doc(db, "takeOutOrders", orderId);
    const tableDocId = useTableStore.getState().getTableDocId(tableNumber);
    if (!tableDocId) {
      throw new Error(
        "Cannot find table in app. Open the Tables tab to sync, then try again.",
      );
    }
    const tableRef = doc(db, "tables", tableDocId);

    const [orderSnap, tableSnap] = await Promise.all([
      getDoc(takeOutRef),
      getDoc(tableRef),
    ]);

    if (!orderSnap.exists()) {
      throw new Error("Take-out order not found.");
    }
    if (!tableSnap.exists()) {
      throw new Error("Table not found.");
    }

    const data = orderSnap.data() as Record<string, unknown> & {
      orderType?: string;
      status?: OrderStatus;
      staff?: string;
      orderItems?: OrderItem[];
      taxBreakDown?: TaxBreakDown;
      paid?: boolean;
      printed?: boolean;
      createdAt?: Timestamp;
    };

    if (data.orderType !== OrderType.TakeOut) {
      throw new Error("This order is not take-out.");
    }
    if (data.status !== OrderStatus.InProgress) {
      throw new Error("Only in-progress orders can be converted.");
    }

    const tableData: Table = {
      ...(tableSnap.data() as Table),
      id: tableSnap.id,
    };
    if (tableData.status !== TableStatus.Open) {
      throw new Error("That table is not available. Choose another.");
    }
    if (tableData.currentOrderId) {
      throw new Error("That table already has an order.");
    }

    const orderItems = data.orderItems ?? [];
    if (orderItems.length === 0) {
      throw new Error("Cannot convert an empty order.");
    }

    const itemsSubtotal = orderItemsSubtotal(orderItems);
    const d = data.taxBreakDown?.discount;
    const taxBreakDown = calculateTaxBreakdown(
      itemsSubtotal,
      d?.discountType ?? DiscountType.None,
      d?.discountValue ?? 0,
    );

    const cleanOrderItems = ungroupOrderItems(orderItems).map((item) => {
      const cleanItem: OrderItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        togo: item.togo,
        appetizer: item.appetizer,
        kitchenType: item.kitchenType,
        paid: item.paid ?? false,
        options: item.options ?? [],
        extras: item.extras ?? [],
        changes: item.changes ?? [],
        ...(item.instructions && { instructions: item.instructions }),
      };
      return cleanItem;
    });

    const dineInPayload: Record<string, unknown> = {
      id: orderId,
      orderType: OrderType.DineIn,
      staff: data.staff ?? "",
      orderItems: cleanOrderItems,
      taxBreakDown,
      status: OrderStatus.InProgress,
      paid: orderPaidFromLineItems(cleanOrderItems),
      printed: data.printed ?? false,
      createdAt: data.createdAt,
      tableNumber,
      guests: g,
    };

    const batch = writeBatch(db);
    batch.delete(takeOutRef);
    batch.set(doc(db, "dineInOrders", orderId), dineInPayload);
    batch.update(tableRef, {
      status: TableStatus.Occupied,
      currentOrderId: orderId,
      guests: g,
    });

    await batch.commit();
  },
}));
