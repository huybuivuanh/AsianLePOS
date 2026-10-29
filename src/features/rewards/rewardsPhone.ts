// Rewards-only phone handling: exactly 10 digits, shown as (000) 000-0000.
// Customer order phone fields keep using formatPhone from utils/helpers.

/** Digits only, max 10. A leading 1 (country code) is dropped — area codes never start with 1. */
export const rewardsPhoneDigits = (text: string): string =>
  text.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);

/**
 * Formats as you type: "(604", "(604) 555", "(604) 555-1234".
 * No trailing ")" or "-" until the next digit, so backspace works normally.
 */
export const formatRewardsPhone = (text: string): string => {
  const d = rewardsPhoneDigits(text);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export const REWARDS_PHONE_PLACEHOLDER = "(000) 000-0000";
