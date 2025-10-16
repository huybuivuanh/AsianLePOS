import dayjs from "dayjs";
import { collection, doc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

// Generate a unique ID

export const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000);

  return dayjs(date).format("DD MMM YYYY, hh:mm A");
};

export const generateFirestoreId = () => {
  return doc(collection(db, "dummy")).id;
};

export const sortTables = (tables: Table[]): Table[] => {
  return [...tables].sort(
    (a, b) => parseInt(a.tableNumber, 10) - parseInt(b.tableNumber, 10)
  );
};
