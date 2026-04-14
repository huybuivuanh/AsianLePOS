import { DiscountType, OrderType, TakeOutFulfillmentKind } from "@/types/enums";
import dayjs from "dayjs";
import { collection, doc, Timestamp } from "firebase/firestore";
import { Alert, Platform } from "react-native";
import { db } from "../lib/firebaseConfig";

export const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000);

  return dayjs(date).format("DD MMM YYYY, hh:mm A");
};

export const formatTimeOnly = (timestamp: Timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000);

  return dayjs(date).format("hh:mm A");
};

export const formatPhone = (phone: string) => {
  phone = phone.replace(/\D/g, ""); // remove any non-digit characters
  if (phone.length > 7) {
    // has area code
    return (
      phone.slice(0, -7) + " " + phone.slice(-7, -4) + "-" + phone.slice(-4)
    );
  } else {
    // no area code
    return phone.slice(0, -4) + "-" + phone.slice(-4);
  }
};

// Convert Firestore Timestamp to JavaScript Date
export const timestampToDate = (
  timestamp: Timestamp | Date | undefined,
): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  // Fallback for plain objects with seconds/nanoseconds
  if (typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(
      (timestamp as any).seconds * 1000 +
        ((timestamp as any).nanoseconds || 0) / 1_000_000,
    );
  }
  return undefined;
};

export const orderItemsSubtotal = (items: OrderItem[] | undefined): number => {
  return (items ?? []).reduce((acc, i) => acc + i.price * i.quantity, 0);
};

/** Order-level `paid` when there is at least one line and every line has `paid: true`. */
export const orderPaidFromLineItems = (
  items: OrderItem[] | undefined,
): boolean => {
  const list = items ?? [];
  return list.length > 0 && list.every((it) => it.paid === true);
};

/** Subtotal from line items, or taxBreakDown.subTotal when present. */
export const orderSubtotal = (order: Partial<Order>): number => {
  if (order.taxBreakDown?.subTotal != null) {
    return order.taxBreakDown.subTotal;
  }
  return orderItemsSubtotal(order.orderItems);
};

export const calculateDiscountAmount = (
  itemsSubtotal: number,
  discountType?: DiscountType,
  discountValue?: number,
): number => {
  if (itemsSubtotal <= 0) return 0;

  const type = discountType ?? DiscountType.None;
  const value = discountValue ?? 0;

  if (type === DiscountType.Amount) {
    // Clamp amount discount so it can't exceed subtotal.
    return Math.min(itemsSubtotal, Math.max(0, value));
  }

  if (type === DiscountType.Percent) {
    // Clamp percent so it can't go negative or above 100.
    const pct = Math.min(100, Math.max(0, value));
    return (itemsSubtotal * pct) / 100;
  }

  return 0;
};

/** Zero placeholder for selection UI when no items are selected. */
export const EMPTY_TAX_BREAKDOWN: TaxBreakDown = {
  subTotal: 0,
  pst: 0,
  gst: 0,
  total: 0,
};

export const resolveTaxBreakdown = (
  order: Partial<Order>,
): TaxBreakDown | undefined => {
  if (order.taxBreakDown) return order.taxBreakDown;

  const itemsSubtotal = orderItemsSubtotal(order.orderItems);
  return itemsSubtotal > 0
    ? calculateTaxBreakdown(itemsSubtotal, DiscountType.None, 0)
    : undefined;
};

export const takeoutFulfillmentIsScheduled = (order: {
  orderType?: OrderType;
  fulfillment?: TakeOutFulfillment;
}): boolean => {
  if (order.orderType !== OrderType.TakeOut) return false;
  return order.fulfillment?.kind === TakeOutFulfillmentKind.Scheduled;
};

export const takeoutScheduledAt = (order: {
  orderType?: OrderType;
  fulfillment?: TakeOutFulfillment;
}): Timestamp | undefined => {
  if (order.orderType !== OrderType.TakeOut) return undefined;
  const f = order.fulfillment;
  if (f?.kind === "scheduled") return f.scheduledAt;
  return undefined;
};

// Convert order timestamps for UI (keeps fulfillment.scheduledAt as Timestamp)
export const convertOrderTimestamps = (
  order: Partial<AnyOrder>,
): Partial<AnyOrder> => {
  const taxBreakDown = resolveTaxBreakdown(order);
  return {
    ...order,
    taxBreakDown,
    createdAt: order.createdAt,
  };
};

/**
 * Full tax breakdown: `subTotal` = pre-discount line subtotal; taxes apply to
 * `discount.taxableSubtotal` when a discount exists (same as `subTotal` when
 * `discount` is omitted). `discount` is omitted when there is no effective
 * discount (`none` or $0 / 0%).
 */
export const calculateTaxBreakdown = (
  itemsSubtotal: number,
  discountType: DiscountType = DiscountType.None,
  discountValue: number = 0,
): TaxBreakDown => {
  const dType = discountType ?? DiscountType.None;
  const dVal = discountValue ?? 0;

  if (itemsSubtotal <= 0) {
    return {
      subTotal: 0,
      pst: 0,
      gst: 0,
      total: 0,
    };
  }

  const discountAmount = calculateDiscountAmount(itemsSubtotal, dType, dVal);
  const taxableSubtotal = Math.max(0, itemsSubtotal - discountAmount);
  const pst = taxableSubtotal * 0.06;
  const gst = taxableSubtotal * 0.05;
  const total = taxableSubtotal + pst + gst;

  const base: TaxBreakDown = {
    subTotal: itemsSubtotal,
    pst,
    gst,
    total,
  };

  if (dType === DiscountType.None || discountAmount <= 0) {
    return base;
  }

  return {
    ...base,
    discount: {
      discountType: dType,
      discountValue: dVal,
      discountAmount,
      taxableSubtotal,
    },
  };
};

export const generateFirestoreId = () => {
  return doc(collection(db, "dummy")).id;
};

export const sortTables = (tables: Table[]): Table[] => {
  return [...tables].sort(
    (a, b) => parseInt(a.tableNumber, 10) - parseInt(b.tableNumber, 10),
  );
};

export const isTakeOutOrder = (o: AnyOrder): o is TakeOutOrder =>
  o.orderType === OrderType.TakeOut;

export const isDineInOrder = (o: AnyOrder): o is DineInOrder =>
  o.orderType === OrderType.DineIn;

export const sortOrdersByDate = <T extends Order>(orders: T[]): T[] => {
  return [...orders].sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() ?? 0;
    const timeB = b.createdAt?.toMillis?.() ?? 0;

    return timeB - timeA;
  });
};

// Cross-platform alert function
export const showAlert = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    if (message) {
      Alert.alert(title, message);
    } else {
      Alert.alert(title);
    }
  }
};

/** OK / Cancel; resolves true if user confirms. */
export const confirmAlert = (
  title: string,
  message?: string,
): Promise<boolean> => {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(text));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message ?? "", [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
};
