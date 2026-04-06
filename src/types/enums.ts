export enum KitchenType {
  DeepFry = "Deep Fry",
  StirFry = "Stir Fry",
  Other = "Other",
  Both = "Both",
  Drink = "Drink",
}

export enum OrderStatus {
  InProgress = "InProgress",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export enum TimeFormat {
  DateAndTime = "DateAndTime",
  OnlyTime = "OnlyTime",
  OnlyDate = "OnlyDate",
  OnlyMonth = "OnlyMonth",
}

export enum OrderType {
  DineIn = "Dine In",
  TakeOut = "Take Out",
}

export enum DiscountType {
  None = "None",
  Amount = "Amount",
  Percent = "Percent",
}

export enum TakeOutFulfillmentKind {
  Immediate = "immediate",
  Scheduled = "scheduled",
}

export enum TableStatus {
  Open = "Open",
  Occupied = "Occupied",
}
