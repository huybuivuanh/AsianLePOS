import { useOnlineOrdersStore } from "@/stores/useOnlineOrdersStore";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import { timestampToDate } from "@/utils/helpers";
import { useMemo } from "react";

export type TakeOutListItem = TakeOutOrder | OnlineOrder;

export const isOnlineOrder = (o: TakeOutListItem): o is OnlineOrder =>
  (o as OnlineOrder).source === "online";

// A brand-new POS order has no createdAt until the server sets it: keep it on top.
const createdAtMillis = (o: TakeOutListItem) =>
  timestampToDate(o.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;

/** POS take-out orders and online orders together, newest first, paged. */
export function useTakeOutHistoryList() {
  const fullTakeOutOrders = useTakeOutOrdersStore((s) => s.fullTakeOutOrders);
  const visibleLimit = useTakeOutOrdersStore((s) => s.visibleLimit);
  const loadMore = useTakeOutOrdersStore((s) => s.increaseVisibleLimit);
  const onlineOrders = useOnlineOrdersStore((s) => s.onlineOrders);

  const merged = useMemo(() => {
    const all: TakeOutListItem[] = [...fullTakeOutOrders, ...onlineOrders];
    return all
      .map((o) => ({ o, t: createdAtMillis(o) }))
      .sort((a, b) => b.t - a.t)
      .map(({ o }) => o);
  }, [fullTakeOutOrders, onlineOrders]);

  const items = useMemo(() => merged.slice(0, visibleLimit), [merged, visibleLimit]);

  return { items, hasMore: merged.length > visibleLimit, loadMore };
}
