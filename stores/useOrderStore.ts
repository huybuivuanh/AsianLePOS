import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType } from "@/types/enum";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
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
  getOrderTotal: () => number;
  updateOrderItem: (itemId: string, fields: Partial<OrderItem>) => void;
  setOrder: (order: Partial<Order>) => void;
  submitOrder: (order: Partial<Order>) => Promise<void>;
  updateOrderOnFirestore: (order: Partial<Order>) => Promise<void>;
  cancelOrder: (order: Partial<Order>) => Promise<void>;
  completeOrder: (order: Partial<Order>) => Promise<void>;
  submitToPrintQueue: (order: Partial<Order>) => Promise<void>;
};

// Default "empty" order
const defaultOrder: Partial<Order> = {
  orderItems: [],
  isPreorder: false,
  orderType: OrderType.TakeOut,
  readyTime: 20,
  printed: false,
  addedToPrintQueue: false,
  createdAt: new Date(),
};

export const useOrderStore = create<OrderState>((set, get) => ({
  order: { ...defaultOrder },
  editingOrder: false,

  setEditingOrder: (editing) => set({ editingOrder: editing }),

  updateOrder: (fields) =>
    set((state) => ({
      order: { ...state.order, ...fields },
    })),

  addItem: (item) =>
    set((state) => ({
      order: {
        ...state.order,
        orderItems: [...(state.order.orderItems ?? []), item],
      },
    })),

  removeItem: (itemId) =>
    set((state) => ({
      order: {
        ...state.order,
        orderItems:
          state.order.orderItems?.filter((i) => i.id !== itemId) ?? [],
      },
    })),

  updateQuantity: (itemId, quantity) => {
    const items = get().order.orderItems ?? [];
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set((state) => ({
      order: {
        ...state.order,
        orderItems: items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
        ),
      },
    }));
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

  getOrderTotal: () => {
    return (get().order.orderItems ?? []).reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
  },

  updateOrderItem: (itemId: string, fields: Partial<OrderItem>) =>
    set((state) => ({
      order: {
        ...state.order,
        orderItems: state.order.orderItems?.map((item) =>
          item.id === itemId ? { ...item, ...fields } : item
        ),
      },
    })),

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

    const orderToSubmit: Partial<Order> = {
      ...order,
      total,
      status: OrderStatus.InProgress,
      printed: false,
      createdAt: Timestamp.fromDate(new Date()),
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

    const updateData: Partial<Order> = {
      ...order,
      total,
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
    });

    await batch.commit();
  },

  submitToPrintQueue: async (order: Partial<Order>) => {
    if (!order.id) throw new Error("Order ID is required to print.");

    const collectionName =
      order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";
    const orderRef = doc(db, collectionName, order.id);
    await updateDoc(orderRef, {
      addedToPrintQueue: true,
    });

    const printQueueRef = doc(collection(db, "printQueue"));
    await setDoc(printQueueRef, order);
  },
}));
