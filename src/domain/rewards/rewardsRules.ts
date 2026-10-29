import { DiscountType, OrderStatus } from "@/types/enums";

// Rewards rules (pure). The server functions are the source of truth;
// these are for showing staff what will happen before they press a button.

/** 1 point per $1 of pre-tax subtotal, after any discount/redemption. */
export const POINTS_PER_DOLLAR = 1;

/** Redemption step: 100 points = $5 off. */
export const POINTS_PER_REDEEM_STEP = 100;
export const DOLLARS_PER_REDEEM_STEP = 5;
/** Most steps in one redemption (server limit). */
export const MAX_REDEEM_STEPS = 20;

/** Points a pre-tax amount earns (whole points, rounded down). */
export const pointsForAmount = (amount: number): number =>
  amount > 0 ? Math.floor(amount * POINTS_PER_DOLLAR) : 0;

/** Pre-tax amount the order earns on: subtotal after any discount/redemption. */
export const orderEarnableAmount = (order: Pick<Order, "taxBreakDown">): number =>
  order.taxBreakDown?.discount?.taxableSubtotal ?? order.taxBreakDown?.subTotal ?? 0;

/**
 * Why Redeem is unavailable for this order, or null if it's allowed.
 * `memberPoints` is the member's balance.
 */
export const redeemBlockedReason = (
  order: Pick<Order, "status" | "taxBreakDown" | "loyalty">,
  memberPoints: number,
): string | null => {
  if (order.status !== OrderStatus.InProgress) return "Only open orders can redeem.";
  if (order.loyalty?.pointsRedeemed) return "Points were already redeemed on this order.";
  if (order.loyalty?.pointsEarned != null) return "Points were already collected — redeem before collecting.";
  const d = order.taxBreakDown?.discount;
  if (d && d.discountType !== DiscountType.None) return "This order already has a discount.";
  if (memberPoints < POINTS_PER_REDEEM_STEP) return `Needs at least ${POINTS_PER_REDEEM_STEP} points.`;
  if ((order.taxBreakDown?.subTotal ?? 0) < DOLLARS_PER_REDEEM_STEP) return "Order is too small to redeem.";
  return null;
};

/** Why Collect is unavailable for this order, or null if it's allowed. */
export const collectBlockedReason = (
  order: Pick<Order, "status" | "taxBreakDown" | "loyalty">,
): string | null => {
  if (order.status === OrderStatus.Cancelled) return "This order was cancelled.";
  if (order.loyalty?.pointsEarned != null) {
    return `${order.loyalty.pointsEarned} points were already collected for this order.`;
  }
  if (pointsForAmount(orderEarnableAmount(order)) <= 0) return "Nothing to collect on this order.";
  return null;
};

/**
 * Most $5 steps the member can redeem on this order: limited by their
 * balance and by the order's subtotal (a redemption never goes below $0).
 */
export const maxRedeemSteps = (balance: number, subtotal: number): number =>
  Math.max(
    0,
    Math.min(
      MAX_REDEEM_STEPS,
      Math.floor(balance / POINTS_PER_REDEEM_STEP),
      Math.floor(subtotal / DOLLARS_PER_REDEEM_STEP),
    ),
  );
