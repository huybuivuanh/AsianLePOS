// Saves rewards results onto the POS order (POS Firestore). The rewards
// function runs first; these writes record what it confirmed.
import { firebase } from "@/lib/firebaseConfig";
import type { EarnPointsResult, RedeemPointsResult, RewardsMember } from "@/services/rewardsService";
import { DiscountType, OrderType } from "@/types/enums";
import { calculateTaxBreakdown, orderItemsSubtotal } from "@/utils/helpers";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

export const orderCollection = (orderType: OrderType) =>
  orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";

/** Applies a redemption as the order's Amount discount and links the member. */
export async function applyRedemptionToOrder(
  orderType: OrderType,
  orderId: string,
  member: RewardsMember,
  result: RedeemPointsResult,
): Promise<void> {
  const ref = doc(firebase.db, orderCollection(orderType), orderId);
  await runTransaction(firebase.db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Order not found.");
    const order = snap.data() as AnyOrder;

    // Already saved (retry after a slow response): nothing to do.
    if (order.loyalty?.pointsRedeemed) return;

    const existing = order.taxBreakDown?.discount;
    if (existing && existing.discountType !== DiscountType.None) {
      throw new Error(
        "A discount was added to this order meanwhile. Points were redeemed but not applied — remove the discount and press Redeem again.",
      );
    }

    tx.update(ref, {
      taxBreakDown: calculateTaxBreakdown(
        orderItemsSubtotal(order.orderItems),
        DiscountType.Amount,
        result.discountAmount,
      ),
      "loyalty.memberId": member.memberId,
      "loyalty.memberName": member.name,
      "loyalty.pointsRedeemed": result.pointsRedeemed,
      "loyalty.redeemedAmount": result.discountAmount,
    });
  });
}

/** Records collected points on the order and links the member. */
export async function markPointsCollected(
  orderType: OrderType,
  orderId: string,
  member: RewardsMember,
  result: EarnPointsResult,
): Promise<void> {
  const ref = doc(firebase.db, orderCollection(orderType), orderId);
  await runTransaction(firebase.db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Order not found.");
    tx.update(ref, {
      "loyalty.memberId": member.memberId,
      "loyalty.memberName": member.name,
      "loyalty.pointsEarned": result.pointsEarned,
      "loyalty.collectedAt": serverTimestamp(),
    });
  });
}
