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

  type OrderItem = {
    id?: string;
    item: MenuItem;
    price: number;
    quantity: number;
    options?: ItemOtpion[];
    changes?: ItemChange[];
    extras?: AddExtra[];
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

  type Order = {
    id?: string;
    name?: string;
    phoneNumber?: string;
    staff: User;
    readyTime?: number;
    isPreorder: boolean;
    preorderTime?: TimeStamp;
    orderType: OrderType;
    table?: string;
    orderItems: OrderItem[];
    total: number;
    status: OrderStatus;
    printed: boolean;
    addedToPrintQueue: boolean;
    createdAt: TimeStamp;
  };

  type Table = {
    tableNumber: string;
    status: TableStatus;
    guests: number;
    currentOrder?: Order;
  };
}
