import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType } from "@/types/enums";
import { calculateTaxBreakdown } from "@/utils/helpers";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { create } from "zustand";

// Types
type OrderState = {
  order: Partial<Order>;
  editingOrder: boolean;

  // actions
  setEditingOrder: (editing: boolean) => void;
  updateOrder: (fields: Partial<Order>) => void;
  addItem: (item: OrderItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearOrder: () => void;
  getTotalItems: () => number;
  getTaxBreakdown: () => TaxBreakDown | undefined;
  updateOrderItem: (itemId: string, fields: Partial<OrderItem>) => void;
  setOrder: (order: Partial<Order>) => void;
  submitOrder: (order: Partial<Order>) => Promise<void>;
  updateOrderOnFirestore: (order: Partial<Order>) => Promise<void>;
  cancelOrder: (order: Partial<Order>) => Promise<void>;
  completeOrder: (order: Partial<Order>) => Promise<void>;
  markOrderAsPaid: (order: Partial<Order>, paid: boolean) => Promise<void>;
  submitToPrintQueue: (order: Partial<Order>) => Promise<void>;
  submitSelectedItemsToPrintQueue: (
    order: Partial<Order>,
    selectedItemIds: string[]
  ) => Promise<void>;
};

// Default "empty" order
const defaultOrder: Partial<Order> = {
  orderItems: [],
  isPreorder: false,
  orderType: OrderType.TakeOut,
  readyTime: 15,
  printed: false,
  createdAt: new Date(),
};

export const useOrderStore = create<OrderState>((set, get) => ({
  order: { ...defaultOrder },
  editingOrder: false,

  setEditingOrder: (editing) => set({ editingOrder: editing }),

  updateOrder: (fields) =>
    set((state) => {
      // Remove undefined values from fields before spreading
      const cleanFields: Partial<Order> = {};
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanFields[key as keyof Order] = value;
        }
      });
      return {
        order: { ...state.order, ...cleanFields },
      };
    }),

  addItem: (item) =>
    set((state) => {
      const newOrderItems = [...(state.order.orderItems ?? []), item];
      const total = newOrderItems.reduce(
        (acc, i) => acc + i.price * i.quantity,
        0
      );
      const taxBreakDown = calculateTaxBreakdown(total);
      return {
        order: {
          ...state.order,
          orderItems: newOrderItems,
          total,
          taxBreakDown,
        },
      };
    }),

  removeItem: (itemId) =>
    set((state) => {
      const newOrderItems =
        state.order.orderItems?.filter((i) => i.id !== itemId) ?? [];
      const total = newOrderItems.reduce(
        (acc, i) => acc + i.price * i.quantity,
        0
      );
      const taxBreakDown = calculateTaxBreakdown(total);
      return {
        order: {
          ...state.order,
          orderItems: newOrderItems,
          total,
          taxBreakDown,
        },
      };
    }),

  updateQuantity: (itemId, quantity) => {
    const items = get().order.orderItems ?? [];
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set((state) => {
      const newOrderItems = items.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      );
      const total = newOrderItems.reduce(
        (acc, i) => acc + i.price * i.quantity,
        0
      );
      const taxBreakDown = calculateTaxBreakdown(total);
      return {
        order: {
          ...state.order,
          orderItems: newOrderItems,
          total,
          taxBreakDown,
        },
      };
    });
  },

  clearOrder: () => {
    set({ order: defaultOrder });
  },

  getTotalItems: () => {
    return (get().order.orderItems ?? []).reduce(
      (acc, item) => acc + item.quantity,
      0
    );
  },

  getTaxBreakdown: () => {
    const order = get().order;
    if (order.taxBreakDown) {
      return order.taxBreakDown;
    }
    const total = (order.orderItems ?? []).reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    return total > 0 ? calculateTaxBreakdown(total) : undefined;
  },

  updateOrderItem: (itemId: string, fields: Partial<OrderItem>) =>
    set((state) => {
      // Ensure we have a valid orderItems array
      if (!state.order.orderItems || !Array.isArray(state.order.orderItems)) {
        return state;
      }

      // Create a new array with updated item
      const newOrderItems = state.order.orderItems.map((item) => {
        if (item.id === itemId) {
          // Create a new object with updated fields
          // Only include instructions if it has a value (not undefined or empty)
          const updatedItem: OrderItem = {
            id: item.id,
            name: fields.name ?? item.name,
            price: fields.price ?? item.price,
            quantity: fields.quantity ?? item.quantity,
            togo: fields.togo ?? item.togo,
            appetizer: fields.appetizer ?? item.appetizer,
            kitchenType: fields.kitchenType ?? item.kitchenType,
            // Only include instructions if it exists and is not empty
            ...(fields.instructions !== undefined
              ? fields.instructions.trim()
                ? { instructions: fields.instructions.trim() }
                : {} // Omit instructions if empty string
              : item.instructions
                ? { instructions: item.instructions }
                : {}), // Omit if undefined
            // Always use the provided arrays if they exist, otherwise keep existing
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

      const total = newOrderItems.reduce(
        (acc, i) => acc + i.price * i.quantity,
        0
      );
      const taxBreakDown = calculateTaxBreakdown(total);
      return {
        order: {
          ...state.order,
          orderItems: newOrderItems,
          total,
          taxBreakDown,
        },
      };
    }),

  setOrder: (order) => set({ order }),

  submitOrder: async (order) => {
    if (!order.id) throw new Error("Cannot submit order without ID.");

    let firestorecollection = "takeOutOrders";
    if (order.orderType !== OrderType.DineIn) {
      if (!order.orderItems || order.orderItems.length === 0)
        throw new Error("Cannot submit empty order.");
      if (!order.name && !order.phoneNumber)
        throw new Error("Missing customer info.");
    } else {
      firestorecollection = "dineInOrders";
    }

    const total = (order.orderItems ?? []).reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );

    const taxBreakDown = calculateTaxBreakdown(total);

    // Build orderToSubmit with only defined values - never include undefined
    const orderToSubmit: Partial<Order> = {
      id: order.id,
      orderType: order.orderType,
      orderItems: order.orderItems,
      total,
      taxBreakDown,
      status: OrderStatus.InProgress,
      paid: false,
      printed: false,
      createdAt: Timestamp.fromDate(new Date()),
      isPreorder: order.isPreorder ?? false,
      readyTime: order.readyTime,
      staff: order.staff,
      // Only include optional fields if they have values
      ...(order.name && { name: order.name }),
      ...(order.phoneNumber && { phoneNumber: order.phoneNumber }),
      ...(order.tableNumber && { tableNumber: order.tableNumber }),
      ...(order.guests !== undefined && { guests: order.guests }),
      ...(order.preorderTime && { preorderTime: order.preorderTime }),
    };

    // Use batch write for atomic operation and better performance
    const batch = writeBatch(db);
    batch.set(doc(db, firestorecollection, order.id!), orderToSubmit);
    batch.set(doc(db, "orderHistory", order.id!), orderToSubmit);
    await batch.commit();

    get().clearOrder();
  },

  updateOrderOnFirestore: async (order) => {
    if (!order.id) throw new Error("Cannot update order without ID.");

    const firestorecollection =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

    // Calculate total
    const total = (order.orderItems ?? []).reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );

    const taxBreakDown = calculateTaxBreakdown(total);

    // Build updateData with only defined values - never include undefined
    // Use conditional spreading for ALL optional fields
    // Also ensure orderItems array doesn't contain undefined nested fields
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
        // Only include instructions if it has a value
        ...(item.instructions && { instructions: item.instructions }),
      };
      return cleanItem;
    });

    const updateData: Partial<Order> = {
      id: order.id,
      orderType: order.orderType,
      orderItems: cleanOrderItems,
      total,
      taxBreakDown,
      status: order.status,
      paid: order.paid ?? false,
      printed: order.printed ?? false,
      isPreorder: order.isPreorder ?? false,
      staff: order.staff,
      // Only include optional fields if they have values (not undefined)
      ...(order.name && { name: order.name }),
      ...(order.phoneNumber && { phoneNumber: order.phoneNumber }),
      ...(order.tableNumber !== undefined && {
        tableNumber: order.tableNumber,
      }),
      ...(order.guests !== undefined && { guests: order.guests }),
      ...(order.readyTime !== undefined && { readyTime: order.readyTime }),
      ...(order.preorderTime && { preorderTime: order.preorderTime }),
      ...(order.createdAt && { createdAt: order.createdAt }),
    };

    // Use batch write to update both collections atomically
    const batch = writeBatch(db);

    // Update main order collection
    const orderRef = doc(db, firestorecollection, order.id);
    batch.update(orderRef, updateData);

    // Update order history
    const historyRef = doc(db, "orderHistory", order.id);
    batch.update(historyRef, updateData);

    await batch.commit();
  },

  cancelOrder: async (order: Partial<Order>) => {
    if (!order.id) throw new Error("Order ID is required to cancel.");

    let firestorecollection = "takeOutOrders";
    if (order.orderType === OrderType.DineIn) {
      firestorecollection = "dineInOrders";
    }

    // Use batch write for atomic operation
    const batch = writeBatch(db);

    // Delete from main collection
    const orderRef = doc(db, firestorecollection, order.id);
    batch.delete(orderRef);

    // Update order history with canceled status
    const orderHistoryRef = doc(db, "orderHistory", order.id);
    batch.update(orderHistoryRef, {
      status: OrderStatus.Canceled,
    });

    await batch.commit();
  },

  completeOrder: async (order: Partial<Order>) => {
    if (!order.id) throw new Error("Order ID is required to complete.");

    let firestorecollection = "takeOutOrders";
    if (order.orderType === OrderType.DineIn) {
      firestorecollection = "dineInOrders";
    }

    // Use batch write for atomic operation
    const batch = writeBatch(db);

    // Delete from main collection
    const orderRef = doc(db, firestorecollection, order.id);
    batch.delete(orderRef);

    // Update order history with completed status
    const orderHistoryRef = doc(db, "orderHistory", order.id);
    batch.update(orderHistoryRef, {
      status: OrderStatus.Completed,
      paid: true,
    });

    await batch.commit();
  },

  markOrderAsPaid: async (order: Partial<Order>, paid: boolean) => {
    if (!order.id) throw new Error("Order ID is required to mark as paid.");

    const firestorecollection =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

    // Use batch write to update both collections atomically
    const batch = writeBatch(db);

    // Update main order collection
    const orderRef = doc(db, firestorecollection, order.id);
    batch.update(orderRef, { paid });

    // Update order history
    const historyRef = doc(db, "orderHistory", order.id);
    batch.update(historyRef, { paid });

    await batch.commit();
  },

  submitToPrintQueue: async (order: Partial<Order>) => {
    if (!order.id) throw new Error("Order ID is required to print.");
    const printQueueRef = doc(collection(db, "printQueue"));
    await setDoc(printQueueRef, order);
  },

  submitSelectedItemsToPrintQueue: async (
    order: Partial<Order>,
    selectedItemIds: string[]
  ) => {
    if (!order.id) throw new Error("Order ID is required to print.");
    if (selectedItemIds.length === 0)
      throw new Error("At least one item must be selected.");

    // Filter order items to only include selected ones
    const selectedItems =
      order.orderItems?.filter((item) =>
        item.id ? selectedItemIds.includes(item.id) : false
      ) || [];

    // Calculate total for selected items only
    const selectedTotal = selectedItems.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );
    const selectedTaxBreakDown = calculateTaxBreakdown(selectedTotal);

    // Create a partial order with only selected items
    const partialOrder: Partial<Order> = {
      ...order,
      orderItems: selectedItems,
      total: selectedTotal,
      taxBreakDown: selectedTaxBreakDown,
    };

    const printQueueRef = doc(collection(db, "printQueue"));
    await setDoc(printQueueRef, partialOrder);
  },
}));
