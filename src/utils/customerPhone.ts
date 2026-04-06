/** Strip to digits only (for matching / storage). */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Last 7 digits when at least 7 digits exist (local number, no area code). */
export function lastSevenDigits(digits: string): string | null {
  if (digits.length < 7) return null;
  return digits.slice(-7);
}

function customerCreatedMs(c: Customer): number {
  const t = c.createdAt as { seconds?: number } | undefined;
  if (t && typeof t.seconds === "number") {
    return t.seconds * 1000;
  }
  return 0;
}

/** Newest first when multiple rows share the same last-7 match. */
export function findBestCustomerByLast7(
  customers: Customer[],
  last7: string,
): Customer | undefined {
  const matches = customers.filter((c) => {
    const d = extractPhoneDigits(c.phone);
    const l7 = lastSevenDigits(d);
    return l7 === last7;
  });
  if (matches.length === 0) return undefined;
  matches.sort((a, b) => customerCreatedMs(b) - customerCreatedMs(a));
  return matches[0];
}
