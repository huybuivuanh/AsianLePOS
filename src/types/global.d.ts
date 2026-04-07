import type { Timestamp } from "firebase/firestore";

export {};

declare global {
  interface FoodCategory {
    id?: string;
    name: string;
    itemIds?: string[];
    order: number;
    createdAt: Timestamp;
  }

  interface OptionGroupId {
    optionGroupId: string;
    order: number;
  }

  interface MenuItem {
    id?: string;
    name: string;
    price: number;
    optionGroupIds?: OptionGroupId[];
    categoryIds?: string[];
    kitchenType: KitchenType;
    createdAt: Timestamp;
  }

  interface OptionGroup {
    id?: string;
    name: string;
    minSelection: number;
    maxSelection: number;
    multipleOptionQuantity: boolean;
    optionIds?: string[];
    itemIds?: string[];
    defaultOptionId?: string;
    createdAt: Timestamp;
  }

  interface ItemOption {
    id?: string;
    name: string;
    price: number;
    groupIds?: string[];
    createdAt: Timestamp;
  }

  interface OrderItemOption {
    name: string;
    price: number;
    quantity: number;
  }

  interface OrderItem {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    options?: OrderItemOption[];
    changes?: ItemChange[];
    extras?: AddExtra[];
    togo: boolean;
    appetizer: boolean;
    kitchenType: KitchenType;
    instructions?: string;
    paid: boolean;
  }

  interface ItemChange {
    from: string;
    to: string;
    price: number;
  }

  interface AddExtra {
    description: string;
    price: number;
  }

  interface Discount {
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    taxableSubtotal: number;
  }

  interface TaxBreakDown {
    subTotal: number;
    discount?: Discount;
    pst: number;
    gst: number;
    total: number;
  }

  type TakeOutFulfillment =
    | {
        kind: "immediate";
        readyTimeMinutes?: number;
      }
    | {
        kind: "scheduled";
        scheduledAt: Timestamp;
      };

  interface Order {
    id?: string;
    staff: string;
    orderType: OrderType;
    orderItems: OrderItem[];
    taxBreakDown: TaxBreakDown;
    status: OrderStatus;
    paid: boolean;
    printed: boolean;
    createdAt: Timestamp;
  }

  interface TakeOutOrder extends Order {
    orderType: OrderType.TakeOut;
    customerName?: string;
    phoneNumber?: string;
    fulfillment: TakeOutFulfillment;
  }

  interface DineInOrder extends Order {
    orderType: OrderType.DineIn;
    tableNumber: string;
    guests: number;
  }

  type AnyOrder = TakeOutOrder | DineInOrder;

  interface Table {
    id?: string;
    tableNumber: string;
    status: TableStatus;
    guests: number;
    currentOrderId: string | null;
  }

  interface Customer {
    id?: string;
    name: string;
    phone: string;
    createdAt: Timestamp;
  }
}
