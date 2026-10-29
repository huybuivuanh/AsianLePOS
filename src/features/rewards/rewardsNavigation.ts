import { OrderType } from "@/types/enums";
import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export type RewardsLookup = { memberId: string } | { phone: string };

/** Opens the rewards member page for an order (dine-in or take-out). */
export function openRewardsMember(
  router: Router,
  orderId: string,
  orderType: OrderType,
  lookup: RewardsLookup,
) {
  router.push({
    pathname: "/rewards/member",
    params: {
      orderId,
      orderType: orderType === OrderType.DineIn ? "dinein" : "takeout",
      ...lookup,
    },
  });
}
