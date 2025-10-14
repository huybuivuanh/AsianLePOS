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
    createdAt: Date;
  };

  type MenuItem = {
    id?: string;
    name: string;
    price: number;
    optionGroupIds?: string[];
    categoryIds?: string[];
    kitchenType: KitchenType;
    createdAt: Date;
  };

  type OptionGroup = {
    id?: string;
    name: string;
    minSelection: number;
    maxSelection: number;
    optionIds?: string[];
    itemIds?: string[];
    createdAt: Date;
  };

  type ItemOption = {
    id?: string;
    name: string;
    price: number;
    groupIds?: string[];
    createdAt: Date;
  };

  type OrderItem = {
    id?: string;
    item: MenuItem;
    price: number;
    quantity: number;
    options?: ItemOtpion[];
    instructions?: string;
  };

  type ItemChange = {
    description: string;
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
    preorderTime?: Date;
    orderType: OrderType;
    table?: string;
    orderItems: OrderItem[];
    total: number;
    status: OrderStatus;
    printed: boolean;
    createdAt: Date;
  };
}
