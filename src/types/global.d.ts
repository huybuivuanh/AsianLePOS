export {};

declare global {
  interface FoodCategory {
    id?: string;
    name: string;
    itemIds?: string[];
    order: number;
    createdAt: TimeStamp;
  }

  interface MenuItem {
    id?: string;
    name: string;
    price: number;
    optionGroupIds?: string[];
    categoryIds?: string[];
    kitchenType: KitchenType;
    createdAt: TimeStamp;
  }

  interface OptionGroup {
    id?: string;
    name: string;
    minSelection: number;
    maxSelection: number;
    multipleSelection?: boolean;
    optionIds?: string[];
    itemIds?: string[];
    createdAt: TimeStamp;
  }

  interface ItemOption {
    id?: string;
    name: string;
    price: number;
    groupIds?: string[];
    createdAt: TimeStamp;
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
        scheduledAt: TimeStamp;
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
    createdAt: TimeStamp;
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
    tableNumber: string;
    status: TableStatus;
    guests: number;
    currentOrderId: string | null;
  }
}
