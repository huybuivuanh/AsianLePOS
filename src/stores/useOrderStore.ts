import * as orderService from "@/services/orderService";
import * as conversionService from "@/services/conversionService";
import * as printService from "@/services/printService";
import * as tableService from "@/services/tableService";
import { useCartStore } from "@/stores/useCartStore";
import { useTableStore } from "@/stores/useTableStore";
import { TakeOutFulfillmentKind } from "@/types/enums";
import { create } from "zustand";

type OrderActions = {
  submitOrder: (order: OrderDraft) => Promise<void>;
  updateOrderOnFirestore: (order: OrderDraft) => Promise<void>;
  cancelOrder: (order: OrderDraft) => Promise<void>;
  completeOrder: (order: OrderDraft) => Promise<void>;
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

function resolveTableDocId(tableNumber: string | undefined): string | undefined {
  if (!tableNumber) return undefined;
  return useTableStore.getState().getTableDocId(tableNumber);
}

export const useOrderStore = create<OrderActions>(() => ({
  submitOrder: async (order) => {
    const tableDocId = resolveTableDocId(order.tableNumber);
    await orderService.submitOrder(order, tableDocId);
    useCartStore.getState().clearOrder();
  },

  updateOrderOnFirestore: async (order) => {
    await orderService.updateOrder(order);
  },

  cancelOrder: async (order) => {
    const tableDocId = resolveTableDocId(order.tableNumber);
    await orderService.cancelOrder(order, tableDocId);
  },

  completeOrder: async (order) => {
    const tableDocId = resolveTableDocId(order.tableNumber);
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
