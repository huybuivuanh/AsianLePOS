import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType } from "@/types/enum";
import { generateFirestoreId } from "@/utils/utils";
import {
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
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
  setOrder: (order: Order) => void;
  submitOrder: (staff: User) => Promise<void>;
  updateOrderOnFirestore: (staff: User) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
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

  clearOrder: () => set({ order: { ...defaultOrder } }),

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

  setOrder: (order) => set({ order }),

  submitOrder: async (staff: User) => {
    const { order } = get();

    if (!order.orderItems || order.orderItems.length === 0)
      throw new Error("Cannot submit empty order.");
    if (!order.name && !order.phoneNumber)
      throw new Error("Missing customer info.");

    const total = (order.orderItems ?? []).reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );

    const orderToSubmit: Partial<Order> = {
      ...order,
      staff,
      total,
      status: OrderStatus.Pending,
      printed: false,
      createdAt: Timestamp.fromDate(new Date()),
    };

    const orderId = generateFirestoreId();

    await setDoc(doc(db, "takeOutOrders", orderId), orderToSubmit);
    await setDoc(doc(db, "orderHistory", orderId), orderToSubmit);

    get().clearOrder();
  },

  updateOrderOnFirestore: async (staff: User) => {
    const { order } = get();

    if (!order.id) throw new Error("Cannot update order without ID.");

    const orderRef = doc(db, "takeOutOrders", order.id);

    // Include staff info in the update
    const updateData: Partial<Order> = {
      ...order,
      staff,
      total: (order.orderItems ?? []).reduce(
        (acc, i) => acc + i.price * i.quantity,
        0
      ),
    };

    await updateDoc(orderRef, updateData);
  },

  cancelOrder: async (orderId: string) => {
    if (!orderId) throw new Error("Order ID is required to cancel.");

    const takeOutOrderRef = doc(db, "takeOutOrders", orderId);

    await updateDoc(takeOutOrderRef, {
      status: OrderStatus.Canceled,
    });
    await deleteDoc(takeOutOrderRef);

    const orderHistoryRef = doc(db, "orderHistory", orderId);
    await updateDoc(orderHistoryRef, {
      status: OrderStatus.Canceled,
    });
  },

  completeOrder: async (orderId: string) => {
    if (!orderId) throw new Error("Order ID is required to complete.");

    const takeOutOrderRef = doc(db, "takeOutOrders", orderId);

    await updateDoc(takeOutOrderRef, {
      status: OrderStatus.Completed,
    });
    await deleteDoc(takeOutOrderRef);

    const orderHistoryRef = doc(db, "orderHistory", orderId);
    await updateDoc(orderHistoryRef, {
      status: OrderStatus.Completed,
    });
  },
}));
