export {};

declare global {
  type User = {
    id: string;
    name: string;
    email?: string;
  };

  type FoodCategory = {
    id?: string;
    name: string;
    itemIds?: string[];
    order: number;
    createdAt: TimeStamp;
  };

  type MenuItem = {
    id?: string;
    name: string;
    price: number;
    optionGroupIds?: string[];
    categoryIds?: string[];
    kitchenType: KitchenType;
    createdAt: TimeStamp;
  };

  type OptionGroup = {
    id?: string;
    name: string;
    minSelection: number;
    maxSelection: number;
    multipleSelection?: boolean;
    optionIds?: string[];
    itemIds?: string[];
    createdAt: TimeStamp;
  };

  type ItemOption = {
    id?: string;
    name: string;
    price: number;
    groupIds?: string[];
    createdAt: TimeStamp;
  };

  type OrderItemOption = {
    name: string;
    price: number;
    quantity: number;
  };

  type OrderItem = {
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
  };

  type ItemChange = {
    from: string;
    to: string;
    price: number;
  };

  type AddExtra = {
    description: string;
    price: number;
  };

  type TaxBreakDown = {
    pst: number;
    gst: number;
    grandTotal: number;
  };

  type Order = {
    id?: string;
    name?: string;
    phoneNumber?: string;
    staff: User;
    readyTime?: number;
    isPreorder: boolean;
    preorderTime?: TimeStamp;
    tableNumber?: string;
    guests?: number;
    orderType: OrderType;
    orderItems: OrderItem[];
    total: number;
    taxBreakDown: TaxBreakDown;
    status: OrderStatus;
    paid: boolean;
    printed: boolean;
    addedToPrintQueue: boolean;
    createdAt: TimeStamp;
  };

  type Table = {
    tableNumber: string;
    status: TableStatus;
    guests: number;
    currentOrderId: string | null;
  };
}
