import { OrderType, TakeOutFulfillmentKind } from "@/types/enums";
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

/** Subtotal from line items, or taxBreakDown.subTotal when present. */
export const orderSubtotal = (order: Partial<Order>): number => {
  if (order.taxBreakDown?.subTotal != null) {
    return order.taxBreakDown.subTotal;
  }
  return orderItemsSubtotal(order.orderItems);
};

export const resolveTaxBreakdown = (
  order: Partial<Order>,
): TaxBreakDown | undefined => {
  if (order.taxBreakDown) return order.taxBreakDown;
  const sub = orderItemsSubtotal(order.orderItems);
  return sub > 0 ? calculateTaxBreakdown(sub) : undefined;
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
  if (f?.kind === TakeOutFulfillmentKind.Scheduled) return f.scheduledAt;
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

// Calculate tax breakdown for an order (subtotal = pre-tax line total)
export const calculateTaxBreakdown = (subtotal: number): TaxBreakDown => {
  const pst = subtotal * 0.06;
  const gst = subtotal * 0.05;
  const total = subtotal + pst + gst;
  return {
    subTotal: subtotal,
    pst,
    gst,
    total,
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
