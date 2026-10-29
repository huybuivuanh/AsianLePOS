// Rewards rules (pure). The server functions are the source of truth;
// these are for showing staff what will happen before they press a button.

/** 1 point per $1 of pre-tax subtotal, after any discount/redemption. */
export const POINTS_PER_DOLLAR = 1;

/** Redemption step: 100 points = $5 off. */
export const POINTS_PER_REDEEM_STEP = 100;
export const DOLLARS_PER_REDEEM_STEP = 5;

/** Points a pre-tax amount earns (whole points, rounded down). */
export const pointsForAmount = (amount: number): number =>
  amount > 0 ? Math.floor(amount * POINTS_PER_DOLLAR) : 0;

/**
 * Most $5 steps the member can redeem on this order: limited by their
 * balance and by the order's subtotal (a redemption never goes below $0).
 */
export const maxRedeemSteps = (balance: number, subtotal: number): number =>
  Math.max(
    0,
    Math.min(
      Math.floor(balance / POINTS_PER_REDEEM_STEP),
      Math.floor(subtotal / DOLLARS_PER_REDEEM_STEP),
    ),
  );
