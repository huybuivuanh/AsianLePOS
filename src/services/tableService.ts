import { firebase } from "@/lib/firebaseConfig";
import { TableStatus } from "@/types/enums";
import { doc, getDoc, writeBatch } from "firebase/firestore";

export async function changeDineInOrderTable(
  orderId: string,
  fromTableNumber: string,
  toTableNumber: string,
  getTableDocId: (tableNumber: string) => string | undefined,
): Promise<void> {
  if (fromTableNumber === toTableNumber) throw new Error("Select a different table.");

  const orderRef = doc(firebase.db, "dineInOrders", orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Order not found.");

  const orderData = orderSnap.data() as { tableNumber?: string; guests?: number };
  const actualFrom = orderData.tableNumber;
  if (!actualFrom) throw new Error("Order has no table.");

  const rawGuests = Math.floor(Number(orderData.guests ?? 0));
  const g = rawGuests >= 1 ? rawGuests : 1;

  const fromDocId = getTableDocId(actualFrom);
  const toDocId = getTableDocId(toTableNumber);
  if (!fromDocId || !toDocId) {
    throw new Error("Cannot find table in app. Open the Tables tab to sync, then try again.");
  }

  const oldTableRef = doc(firebase.db, "tables", fromDocId);
  const newTableRef = doc(firebase.db, "tables", toDocId);

  const [oldTableSnap, newTableSnap] = await Promise.all([
    getDoc(oldTableRef),
    getDoc(newTableRef),
  ]);

  if (!oldTableSnap.exists() || !newTableSnap.exists()) throw new Error("Table not found.");

  const oldT = { ...(oldTableSnap.data() as Table), id: oldTableSnap.id };
  const newT = { ...(newTableSnap.data() as Table), id: newTableSnap.id };

  if (oldT.currentOrderId !== orderId) {
    throw new Error("This order is no longer on the original table. Go back and refresh.");
  }
  if (newT.status !== TableStatus.Open) {
    throw new Error("That table is not available. Choose another.");
  }

  const batch = writeBatch(firebase.db);
  batch.update(oldTableRef, { status: TableStatus.Open, currentOrderId: null, guests: 0 });
  batch.update(newTableRef, { status: TableStatus.Occupied, currentOrderId: orderId, guests: g });
  batch.update(orderRef, { tableNumber: toTableNumber, guests: g });
  await batch.commit();
}
