import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType } from "@/types/enum";
import {
  addDoc,
  collection,
  doc,
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
  submitOrder: (staff: User) => Promise<string>;
  updateOrderOnFirestore: (staff: User) => Promise<void>;
};

// Default "empty" order
const defaultOrder: Partial<Order> = {
  orderItems: [],
  isPreorder: false,
  orderType: OrderType.TakeOut,
  readyTime: 20,
  printed: false,
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

    const docRef = await addDoc(collection(db, "takeOutOrders"), orderToSubmit);

    get().clearOrder();
    return docRef.id;
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
}));
