import dayjs from "dayjs";
import { Timestamp } from "firebase/firestore";

export const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000);

  return dayjs(date).format("DD MMM YYYY, hh:mm A");
};
