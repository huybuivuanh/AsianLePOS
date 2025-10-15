import { db } from "@/lib/firebaseConfig";
import { OrderStatus, OrderType } from "@/types/enum";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { create } from "zustand";

// --- Zustand state ---
type OrderState = {
  orderItems: OrderItem[];
  customerName: string;
  customerPhone: string;
  readyTime: number;
  isPreorder: boolean;
  preorderDate: Date;
  orderType: OrderType;
  table?: string;

  // actions
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setReadyTime: (minutes: number) => void;
  setIsPreorder: (v: boolean) => void;
  setPreorderDate: (date: Date) => void;
  setOrderType: (type: OrderType) => void;
  setTable: (table: string) => void;

  addItem: (item: OrderItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearOrder: () => void;

  getTotalItems: () => number;
  getOrderTotal: () => number;

  setOrder: (order: Order) => void;
  submitOrder: (staff: User) => Promise<string>;
};

// --- initial state ---
const emptyOrderState: Omit<OrderState, "submitOrder"> = {
  orderItems: [],
  customerName: "",
  customerPhone: "",
  readyTime: 20,
  isPreorder: false,
  preorderDate: new Date(),
  orderType: OrderType.TakeOut,
  table: undefined,

  setCustomerName: () => {},
  setCustomerPhone: () => {},
  setReadyTime: () => {},
  setIsPreorder: () => {},
  setPreorderDate: () => {},
  setOrderType: () => {},
  setTable: () => {},
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearOrder: () => {},
  getTotalItems: () => 0,
  getOrderTotal: () => 0,
  setOrder: () => {},
};

// --- Zustand store ---
export const useOrderStore = create<OrderState>((set, get) => ({
  ...emptyOrderState,

  setCustomerName: (name) => set({ customerName: name }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setReadyTime: (readyTime) => set({ readyTime }),
  setIsPreorder: (isPreorder) => set({ isPreorder }),
  setPreorderDate: (preorderDate) => set({ preorderDate }),
  setOrderType: (orderType) => set({ orderType }),
  setTable: (table) => set({ table }),

  addItem: (item) => {
    const currentItems = get().orderItems;
    set({ orderItems: [...currentItems, { ...item }] });
  },

  removeItem: (itemId) => {
    const currentItems = get().orderItems;
    set({ orderItems: currentItems.filter((i) => i.id !== itemId) });
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    const currentItems = get().orderItems;
    set({
      orderItems: currentItems.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    });
  },

  clearOrder: () => {
    set({
      orderItems: [],
      customerName: "",
      customerPhone: "",
      readyTime: 20,
      isPreorder: false,
      preorderDate: new Date(),
      orderType: OrderType.TakeOut,
      table: undefined,
    });
  },

  getTotalItems: () => {
    return get().orderItems.reduce((acc, item) => acc + item.quantity, 0);
  },

  getOrderTotal: () => {
    return get().orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
  },

  setOrder: (order) => {
    if (!order) return;
    set((state) => ({
      ...state,
      orderItems: order.orderItems ?? state.orderItems,
      customerName: order.name ?? state.customerName,
      customerPhone: order.phoneNumber ?? state.customerPhone,
      readyTime: order.readyTime ?? state.readyTime,
      isPreorder: order.isPreorder ?? state.isPreorder,
      preorderDate: order.preorderTime ?? state.preorderDate,
      orderType: order.orderType ?? state.orderType,
      table: order.table ?? state.table,
    }));
  },

  submitOrder: async (staff: User) => {
    const state = get();

    if (state.orderItems.length === 0)
      throw new Error("Cannot submit empty order.");
    if (!state.customerName && !state.customerPhone)
      throw new Error("Missing customer info.");

    const total = state.orderItems.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );

    const orderToSubmit: Partial<Order> = {
      staff,
      orderType: state.orderType,
      orderItems: state.orderItems,
      total,
      status: OrderStatus.Pending,
      printed: false,
      createdAt: new Timestamp(Date.now() / 1000, 0),
      isPreorder: state.isPreorder,
    };

    if (state.customerName) orderToSubmit.name = state.customerName;
    if (state.customerPhone) orderToSubmit.phoneNumber = state.customerPhone;
    if (state.table) orderToSubmit.table = state.table;
    if (state.isPreorder) {
      orderToSubmit.preorderTime = state.preorderDate;
    } else {
      orderToSubmit.readyTime = state.readyTime;
    }

    const docRef = await addDoc(collection(db, "takeOutOrders"), orderToSubmit);

    get().clearOrder();
    return docRef.id;
  },
}));
