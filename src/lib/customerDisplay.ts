import { Platform } from "react-native";

// Same-origin, same-browser pub/sub for mirroring the live cart onto a
// second window dragged to a customer-facing monitor. No network involved —
// scoped entirely to this browser profile, which is the intended setup
// (one till PC, cashier window + customer-display window side by side).
export const CUSTOMER_DISPLAY_CHANNEL_NAME = "asianle-customer-display";
export const CUSTOMER_DISPLAY_ROUTE = "/customer-display";

export type CustomerDisplayMessage =
  // Sent by the display window on mount to ask the cashier window for the
  // current cart — BroadcastChannel only delivers messages sent *after* a
  // listener attaches, so a freshly opened/reloaded display starts blank
  // without this handshake.
  | { type: "hello" }
  // Live take-out cart being built (useCartStore) — gated take-out-only on
  // the display side.
  | { type: "cart"; order: OrderDraft }
  // Reviewing an already-submitted order for payment (a dine-in table, or a
  // take-out order being settled) — takes priority over "cart" on the
  // display, since it reflects an active payment moment at the counter.
  | {
      type: "bill";
      items: OrderItem[];
      taxBreakDown?: TaxBreakDown;
      tableNumber?: string;
      customerName?: string;
      phoneNumber?: string;
      staff?: string;
      /** Online (website) orders: shown where staff would be. */
      orderNumber?: string;
    }
  // Sent when the cashier leaves the payment screen, so the display falls
  // back to the live cart (or idle) instead of showing a stale bill to
  // whoever's at the counter next.
  | { type: "clear" }
  // Rewards QR scan on the customer screen (the webcam faces the customer).
  // Cashier asks the display to scan; the display answers "rewardsScanStarted"
  // (so the cashier knows a display is open) and later "rewardsScanned".
  | { type: "rewardsScan" }
  | { type: "rewardsScanStarted" }
  | { type: "rewardsScanned"; memberId: string }
  | { type: "rewardsScanEnd" }
  // The member page is open: show the customer their name and points.
  | { type: "rewards"; view: RewardsDisplayView }
  | { type: "rewardsEnd" };

export type RewardsDisplayView = {
  /** Member's full name. */
  name: string;
  points: number;
  /** Result of the last redeem/collect, e.g. "+12 points earned". */
  message?: string;
};

export function createCustomerDisplayChannel(): BroadcastChannel | null {
  if (Platform.OS !== "web" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL_NAME);
}

export function isCustomerDisplayRoute(): boolean {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith(CUSTOMER_DISPLAY_ROUTE)
  );
}
