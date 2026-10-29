import * as orderService from "@/services/orderService";
import * as conversionService from "@/services/conversionService";
import { reverseCancelledOrderRewards } from "@/services/orderLoyaltyService";
import * as printService from "@/services/printService";
import * as tableService from "@/services/tableService";
import { useCartStore } from "@/stores/useCartStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderStatus, OrderType } from "@/types/enums";
import { create } from "zustand";

type OrderActions = {
  submitOrder: (order: OrderDraft) => Promise<{ merged: boolean }>;
  updateOrderOnFirestore: (order: OrderDraft) => Promise<void>;
  /** Resolves with a rewards warning if the order's points could not be reversed. */
  cancelOrder: (order: OrderDraft, options?: TableReleaseOptions) => Promise<string | null>;
  completeOrder: (order: OrderDraft, options?: TableReleaseOptions) => Promise<void>;
  markOrderAsPaid: (order: OrderDraft, paid: boolean) => Promise<void>;
  submitToPrintQueue: (order: OrderDraft) => Promise<void>;
  submitSelectedItemsToPrintQueue: (order: OrderDraft, selectedItemIds: string[]) => Promise<void>;
  changeDineInOrderTable: (args: {
    orderId: string;
    fromTableNumber: string;
    toTableNumber: string;
  }) => Promise<void>;
  convertDineInOrderToTakeOut: (args: {
    orderId: string;
    tableNumber: string;
    customerName?: string;
    phoneNumber?: string;
    fulfillment: TakeOutFulfillment;
  }) => Promise<void>;
  convertTakeOutOrderToDineIn: (args: {
    orderId: string;
    tableNumber: string;
    guests: number;
  }) => Promise<void>;
};

type TableReleaseOptions = {
  /**
   * Only free the table if it still points at this order. Used from order
   * history, where the table may already hold a newer order.
   */
  onlyIfTableHoldsOrder?: boolean;
};

function resolveTableDocId(tableNumber: string | undefined): string | undefined {
  if (!tableNumber) return undefined;
  return useTableStore.getState().getTableDocId(tableNumber);
}

function resolveTableToRelease(
  order: OrderDraft,
  options?: TableReleaseOptions,
): string | undefined {
  if (!options?.onlyIfTableHoldsOrder) return resolveTableDocId(order.tableNumber);
  if (!order.tableNumber || !order.id) return undefined;
  const table = useTableStore.getState().getTable(order.tableNumber);
  return table?.currentOrderId === order.id ? table.id : undefined;
}

export const useOrderStore = create<OrderActions>(() => ({
  submitOrder: async (order) => {
    const tableDocId = resolveTableDocId(order.tableNumber);
    const result = await orderService.submitOrder(order, tableDocId);
    useCartStore.getState().clearOrder();
    return result;
  },

  updateOrderOnFirestore: async (order) => {
    await orderService.updateOrder(order);
  },

  cancelOrder: async (order, options) => {
    const tableDocId = resolveTableToRelease(order, options);
    // Pressing Cancel on a cancelled order undoes it — only reverse points on a real cancel.
    const cancelling = order.status !== OrderStatus.Cancelled;
    await orderService.cancelOrder(order, tableDocId);
    if (!order.id || !cancelling) return null;
    return reverseCancelledOrderRewards(order.orderType ?? OrderType.TakeOut, order.id);
  },

  completeOrder: async (order, options) => {
    const tableDocId = resolveTableToRelease(order, options);
    await orderService.completeOrder(order, tableDocId);
  },

  markOrderAsPaid: async (order, paid) => {
    await orderService.markPaid(order, paid);
  },

  submitToPrintQueue: async (order) => {
    await printService.submitToPrintQueue(order);
  },

  submitSelectedItemsToPrintQueue: async (order, selectedItemIds) => {
    await printService.submitSelectedItemsToPrintQueue(order, selectedItemIds);
  },

  changeDineInOrderTable: async ({ orderId, fromTableNumber, toTableNumber }) => {
    await tableService.changeDineInOrderTable(
      orderId,
      fromTableNumber,
      toTableNumber,
      useTableStore.getState().getTableDocId,
    );
  },

  convertDineInOrderToTakeOut: async (args) => {
    const draft = useCartStore.getState().order;
    const tableDocId = resolveTableDocId(args.tableNumber);
    if (!tableDocId) {
      throw new Error("Cannot find table in app. Open the Tables tab to sync, then try again.");
    }
    await conversionService.convertDineInToTakeOut(args, draft, tableDocId);
    useCartStore.getState().clearOrder();
  },

  convertTakeOutOrderToDineIn: async (args) => {
    await conversionService.convertTakeOutToDineIn(
      args,
      useTableStore.getState().getTableDocId,
    );
  },
}));
