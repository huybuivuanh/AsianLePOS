import {
  extractPhoneDigits,
  findBestCustomerByLast7,
  lastSevenDigits,
} from "@/utils/customerPhone";

/**
 * Syncs customer name/phone from the current cart order into the customers list.
 * Accepts order data explicitly so this function has no store dependency.
 *
 * `seedOrderTotal` only affects the *new customer* branch: a customer created
 * here starts at `numberOfOrders: 1` / `totalSpent: seedOrderTotal`. An existing
 * customer's stats are never touched here — the caller bumps those with a
 * separate, non-versioned write (`bumpCustomerOrderStats`).
 *
 * Returns the matched/created customer id and whether it was newly created, so
 * the caller knows whether the existing-customer stat bump still needs to run.
 */
export async function syncFromCart(
  order: Pick<OrderDraft, "customerName" | "phoneNumber">,
  customers: Customer[],
  addCustomer: (input: {
    name: string;
    phone: string;
    numberOfOrders?: number;
    totalSpent?: number;
  }) => Promise<string | undefined>,
  updateCustomer: (id: string, input: { name: string; phone: string }) => Promise<void>,
  seedOrderTotal: number | null = null,
): Promise<{ id?: string; created: boolean }> {
  const name = (order.customerName || "").trim();
  const digits = extractPhoneDigits(order.phoneNumber || "");
  const last7 = lastSevenDigits(digits);
  if (!last7 || !name) return { created: false };

  const existing = findBestCustomerByLast7(customers, last7);
  const upperName = name.toUpperCase();

  if (existing?.id) {
    const sameName = existing.name.trim().toUpperCase() === upperName;
    const samePhone = extractPhoneDigits(existing.phone) === digits;
    if (!sameName || !samePhone) {
      await updateCustomer(existing.id, { name: upperName, phone: digits });
    }
    return { id: existing.id, created: false };
  }

  const id = await addCustomer({
    name: upperName,
    phone: digits,
    ...(seedOrderTotal !== null
      ? { numberOfOrders: 1, totalSpent: seedOrderTotal }
      : {}),
  });
  return { id, created: true };
}
