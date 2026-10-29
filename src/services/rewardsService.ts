// Calls the Rewards (loyalty) project's Cloud Functions as the signed-in POS
// device. Each function's response is the confirmation — there are no callbacks.
import { rewardsFunctions } from "@/lib/rewardsFirebase";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

export type RewardsMember = {
  memberId: string;
  name: string;
  phone: string;
  points: number;
};

export type LookupMemberInput = { memberId: string } | { phone: string };

export type EarnPointsResult = { pointsEarned: number; newBalance: number };

export type RedeemPointsResult = {
  pointsRedeemed: number;
  /** Dollars off, applied to the order as an Amount discount. */
  discountAmount: number;
  newBalance: number;
};

export type ReverseOrderResult = {
  /** Earned points removed from the member. */
  pointsRemoved: number;
  /** Redeemed points given back to the member. */
  pointsRefunded: number;
  newBalance: number;
};

async function call<In, Out>(name: string, data: In): Promise<Out> {
  if (!rewardsFunctions) {
    throw new Error("Rewards isn't set up in this build.");
  }
  try {
    const result = await httpsCallable<In, Out>(rewardsFunctions, name)(data);
    return result.data;
  } catch (err) {
    throw new Error(rewardsErrorMessage(err));
  }
}

/** Staff-facing message for a failed rewards call. */
export function rewardsErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/not-found":
        return "No rewards member found.";
      case "functions/unauthenticated":
        return "This device isn't signed in to Rewards. Sign in from the Profile tab.";
      case "functions/permission-denied":
        return "This Rewards account doesn't have POS access.";
      case "functions/already-exists":
        return "Points were already collected for this order.";
      case "functions/failed-precondition":
      case "functions/invalid-argument":
        // Server writes a staff-readable message for rule violations
        // (not enough points, order has a discount, …).
        return err.message || "This action isn't allowed for this order.";
      case "functions/unavailable":
      case "functions/deadline-exceeded":
        return "No connection to Rewards. Check the internet and try again.";
    }
  }
  return "Rewards request failed. Try again.";
}

export const lookupMember = (input: LookupMemberInput) =>
  call<LookupMemberInput, RewardsMember>("lookupMember", input);

/** Once per order: safe to retry, the server ignores a second call. */
export const earnPoints = (memberId: string, orderId: string, subtotal: number) =>
  call<{ memberId: string; orderId: string; subtotal: number }, EarnPointsResult>(
    "earnPoints",
    { memberId, orderId, subtotal },
  );

/** `steps` × 100 points → `steps` × $5 off. */
export const redeemPoints = (memberId: string, orderId: string, steps: number) =>
  call<{ memberId: string; orderId: string; steps: number }, RedeemPointsResult>(
    "redeemPoints",
    { memberId, orderId, steps },
  );

/** On cancel: refunds redeemed points and removes earned points for the order. */
export const reverseOrder = (orderId: string) =>
  call<{ orderId: string }, ReverseOrderResult>("reverseOrder", { orderId });
