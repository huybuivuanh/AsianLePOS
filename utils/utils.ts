import dayjs from "dayjs";
import { collection, doc, Timestamp } from "firebase/firestore";
import { Platform, Alert } from "react-native";
import { db } from "../lib/firebaseConfig";

// Generate a unique ID

export const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000);

  return dayjs(date).format("DD MMM YYYY, hh:mm A");
};

// Convert Firestore Timestamp to JavaScript Date
export const timestampToDate = (
  timestamp: Timestamp | Date | undefined
): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  // Fallback for plain objects with seconds/nanoseconds
  if (typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(
      (timestamp as any).seconds * 1000 +
        ((timestamp as any).nanoseconds || 0) / 1_000_000
    );
  }
  return undefined;
};

// Convert order's Firestore Timestamps to JavaScript Dates
export const convertOrderTimestamps = (
  order: Partial<Order>
): Partial<Order> => {
  // Calculate taxBreakDown if missing (for backward compatibility)
  let taxBreakDown = order.taxBreakDown;
  if (!taxBreakDown && order.total !== undefined) {
    taxBreakDown = calculateTaxBreakdown(order.total);
  }

  // Convert preorderTime only if it exists
  const convertedPreorderTime = order.preorderTime
    ? timestampToDate(order.preorderTime as any)
    : undefined;

  return {
    ...order,
    ...(convertedPreorderTime !== undefined && {
      preorderTime: convertedPreorderTime,
    }),
    createdAt: order.createdAt, // Keep as Timestamp for display purposes
    taxBreakDown,
  };
};

// Calculate tax breakdown for an order
export const calculateTaxBreakdown = (subtotal: number): TaxBreakDown => {
  const pst = subtotal * 0.06;
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + pst + gst;
  return {
    pst,
    gst,
    grandTotal,
  };
};

export const generateFirestoreId = () => {
  return doc(collection(db, "dummy")).id;
};

export const sortTables = (tables: Table[]): Table[] => {
  return [...tables].sort(
    (a, b) => parseInt(a.tableNumber, 10) - parseInt(b.tableNumber, 10)
  );
};

export const sortOrdersByDate = (orders: Order[]): Order[] => {
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
