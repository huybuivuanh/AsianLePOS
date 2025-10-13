import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType } from "@/types/enum";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { create } from "zustand";

type OrderState = {
  order: Order;
  addItem: (item: OrderItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getOrderTotal: () => number;
  submitOrder: (orderData?: Partial<Order>) => Promise<string>;
  setOrder: (order: Partial<Order>) => void;
};

const emptyOrder: Order = {
  staff: {
    id: "",
    name: "",
    email: "",
    role: "",
    createdAt: new Date(),
  },
  orderType: OrderType.TakeOut,
  orderItems: [],
  total: 0,
  status: OrderStatus.Pending,
  printed: false,
  created: new Date().toISOString(),
};

export const useOrderStore = create<OrderState>((set, get) => ({
  order: emptyOrder,

  addItem: (item) => {
    const currentOrder = get().order;
    const existingItem = currentOrder.orderItems.find((i) => i.id === item.id);

    if (existingItem) {
      // merge quantities and instructions
      const updatedItems = currentOrder.orderItems.map((i) =>
        i.id === item.id
          ? {
              ...i,
              quantity: i.quantity + item.quantity,
              instructions: item.instructions || i.instructions,
            }
          : i
      );

      set({ order: { ...currentOrder, orderItems: updatedItems } });
    } else {
      const optionTotal =
        item.options?.reduce((sum, opt) => sum + opt.price, 0) ?? 0;
      const totalPrice = item.item.price + optionTotal;

      const updatedOrder = {
        ...currentOrder,
        orderItems: [
          ...currentOrder.orderItems,
          { ...item, price: totalPrice },
        ],
      };
      set({ order: updatedOrder });
    }
  },

  removeItem: (itemId) => {
    const currentOrder = get().order;
    set({
      order: {
        ...currentOrder,
        orderItems: currentOrder.orderItems.filter((i) => i.id !== itemId),
      },
    });
  },

  updateQuantity: (itemId, quantity) => {
    const currentOrder = get().order;
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }

    set({
      order: {
        ...currentOrder,
        orderItems: currentOrder.orderItems.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
        ),
      },
    });
  },

  clearCart: () => {
    set({ order: { ...emptyOrder } });
  },

  getTotalItems: () => {
    return get().order.orderItems.reduce((acc, item) => acc + item.quantity, 0);
  },

  getOrderTotal: () => {
    return get().order.orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
  },

  submitOrder: async (orderData) => {
    const currentOrder = get().order;
    const orderItems = currentOrder.orderItems;
    if (orderItems.length === 0) throw new Error("Cannot submit empty order.");

    const total = get().getOrderTotal();

    const orderToSubmit: Omit<Order, "id"> = {
      ...currentOrder,
      ...orderData,
      orderItems,
      total,
      printed: false,
      status: OrderStatus.Pending,
      created: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "orders"), {
      ...orderToSubmit,
      createdAt: serverTimestamp(),
    });

    get().clearCart();

    return docRef.id;
  },

  setOrder: (partialOrder) => {
    const currentOrder = get().order;
    set({ order: { ...currentOrder, ...partialOrder } });
  },
}));
