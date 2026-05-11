import {
  extractPhoneDigits,
  findBestCustomerByLast7,
  lastSevenDigits,
} from "@/utils/customerPhone";

/**
 * Syncs customer info from the current cart order into the customers list.
 * Accepts order data explicitly so this function has no store dependency.
 */
export async function syncFromCart(
  order: Pick<OrderDraft, "customerName" | "phoneNumber">,
  customers: Customer[],
  addCustomer: (input: { name: string; phone: string }) => Promise<string | undefined>,
  updateCustomer: (id: string, input: { name: string; phone: string }) => Promise<void>,
): Promise<void> {
  const name = (order.customerName || "").trim();
  const digits = extractPhoneDigits(order.phoneNumber || "");
  const last7 = lastSevenDigits(digits);
  if (!last7 || !name) return;

  const existing = findBestCustomerByLast7(customers, last7);
  const upperName = name.toUpperCase();

  if (existing?.id) {
    const sameName = existing.name.trim().toUpperCase() === upperName;
    const samePhone = extractPhoneDigits(existing.phone) === digits;
    if (!sameName || !samePhone) {
      await updateCustomer(existing.id, { name: upperName, phone: digits });
    }
  } else {
    await addCustomer({ name: upperName, phone: digits });
  }
}
