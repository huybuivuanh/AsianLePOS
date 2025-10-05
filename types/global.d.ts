export {};

declare global {
  type User = {
    id?: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
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
    kitchenType: string;
    createdAt: Date;
  };

  type ItemOptionGroup = {
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
}
