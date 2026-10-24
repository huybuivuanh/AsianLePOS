// Customer-facing display — open this route in a second browser window and
// drag it to the extended monitor. Mirrors the cashier's live cart over
// BroadcastChannel (see src/lib/customerDisplay.ts): same browser, same
// origin, no network/Firestore involved. Not auth-gated — this route sits
// outside the (tabs) group on purpose so this window never needs a staff
// login.
import {
  createCustomerDisplayChannel,
  type CustomerDisplayMessage,
} from "@/lib/customerDisplay";
import { DiscountType, OrderType } from "@/types/enums";
import { formatPhone } from "@/utils/helpers";
import { Fragment, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";

type BillView = {
  items: OrderItem[];
  taxBreakDown?: TaxBreakDown;
  tableNumber?: string;
  customerName?: string;
  phoneNumber?: string;
  staff?: string;
};

export default function CustomerDisplayScreen() {
  const [order, setOrder] = useState<OrderDraft | undefined>(undefined);
  const [billView, setBillView] = useState<BillView | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const channel = createCustomerDisplayChannel();
    if (!channel) return;

    channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      const message = event.data;
      if (message?.type === "cart") setOrder(message.order);
      else if (message?.type === "bill")
        setBillView({
          items: message.items,
          taxBreakDown: message.taxBreakDown,
          tableNumber: message.tableNumber,
          customerName: message.customerName,
          phoneNumber: message.phoneNumber,
          staff: message.staff,
        });
      else if (message?.type === "clear") setBillView(null);
    };
    // Ask the cashier window for the current cart — BroadcastChannel only
    // delivers messages sent after a listener attaches, so a fresh/reloaded
    // display otherwise starts blank until the next cart change.
    const message: CustomerDisplayMessage = { type: "hello" };
    channel.postMessage(message);

    return () => channel.close();
  }, []);

  // Dine-in carts are built table-side, out of view of this counter display —
  // only take-out orders (built at the register, in front of the customer)
  // should ever show here. Anything else just falls through to the idle
  // "Welcome" state below.
  const isTakeOut = order?.orderType === OrderType.TakeOut;
  const cartItems = isTakeOut ? (order?.orderItems ?? []) : [];
  const cartTaxBreakDown = isTakeOut ? order?.taxBreakDown : undefined;

  // An active payment review (dine-in table, or a take-out order being
  // settled) takes priority over whatever take-out cart happens to be
  // mid-build — it's the thing actually happening at the counter right now.
  const items = billView ? billView.items : cartItems;
  const taxBreakDown = billView ? billView.taxBreakDown : cartTaxBreakDown;
  // Table/name/phone/staff only ever show for a submitted order being
  // reviewed for payment — never for a cart still being built.
  const tableNumber = billView?.tableNumber;
  const customerName = billView?.customerName;
  const phoneNumber = billView?.phoneNumber;
  const staff = billView?.staff;

  // Default to showing the bottom of the list, so the item the cashier just
  // added is always in view without anyone touching the screen. Scrolling
  // up to review earlier items is a manual, staff-only action from here
  // (mouse wheel on the till PC) — nothing auto-scrolls back down once they
  // do, until the list changes again.
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [items]);

  if (Platform.OS !== "web") {
    return (
      <View className="flex-1 items-center justify-center bg-stone-900 px-8">
        <Text className="text-center text-xl text-stone-300">
          The customer display only works in a browser window on the till
          PC&apos;s extended monitor.
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-900 px-8">
        <Text className="text-center text-6xl font-bold text-white">
          Welcome To Asian Le Restaurant!
        </Text>
        <Text className="mt-4 text-center text-2xl text-stone-400">
          Your order will appear here
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-900 px-10 py-10">
      {Boolean(tableNumber || customerName || phoneNumber || staff) && (
        <View className="mb-6 border-b border-stone-700 pb-4">
          {Boolean(tableNumber) && (
            <Text className="text-3xl font-bold text-white">
              Table: {tableNumber}
            </Text>
          )}
          {(() => {
            const metaFields = [
              customerName && { label: "Name", value: customerName },
              phoneNumber && { label: "Phone", value: formatPhone(phoneNumber) },
              staff && { label: "Staff", value: staff },
            ].filter(Boolean) as { label: string; value: string }[];

            if (metaFields.length === 0) return null;

            return (
              <View className="mt-1 flex-row flex-wrap items-center gap-3">
                {metaFields.map((field, index) => (
                  <Fragment key={field.label}>
                    {index > 0 && <View className="h-5 w-px bg-stone-600" />}
                    <Text className="text-xl font-semibold text-white">
                      <Text className="text-stone-400">{field.label}: </Text>
                      {field.value}
                    </Text>
                  </Fragment>
                ))}
              </View>
            );
          })()}
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <View
            key={item.id ?? index}
            className="mb-4 border-b border-stone-700 pb-4"
          >
            <View className="flex-row items-baseline justify-between gap-4">
              <Text
                className="flex-1 text-2xl font-semibold text-white"
                numberOfLines={2}
              >
                <Text className="font-bold text-stone-400">
                  {item.quantity}
                </Text>
                <Text className="text-stone-500"> × </Text>
                {item.name}
              </Text>
              <Text className="text-2xl font-bold text-white">
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>

            {item.options && item.options.length > 0 && (
              <View className="mt-1.5 pl-1">
                {item.options.map((option, optIndex) => (
                  <Text key={optIndex} className="text-lg text-stone-400">
                    · {option.quantity > 1 ? `${option.quantity}× ` : ""}
                    {option.name}
                  </Text>
                ))}
              </View>
            )}

            {item.extras && item.extras.length > 0 && (
              <View className="mt-1.5 pl-1">
                {item.extras.map((extra, extraIndex) => (
                  <Text key={extraIndex} className="text-lg text-stone-400">
                    · Add {extra.description}
                  </Text>
                ))}
              </View>
            )}

            {item.changes && item.changes.length > 0 && (
              <View className="mt-1.5 pl-1">
                {item.changes.map((change, changeIndex) => (
                  <Text key={changeIndex} className="text-lg text-stone-400">
                    · {change.from} → {change.to}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {taxBreakDown && (
        <View className="border-t-2 border-stone-600 pt-4">
          <View className="flex-row justify-between">
            <Text className="text-xl text-stone-300">Subtotal</Text>
            <Text className="text-xl text-stone-300">
              ${taxBreakDown.subTotal.toFixed(2)}
            </Text>
          </View>

          {taxBreakDown.discount &&
            taxBreakDown.discount.discountAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xl text-stone-300">
                  {taxBreakDown.discount.discountType === DiscountType.Percent
                    ? `Discount (${taxBreakDown.discount.discountValue}%)`
                    : `Discount ($${taxBreakDown.discount.discountValue.toFixed(2)})`}
                </Text>
                <Text className="text-xl text-stone-300">
                  -${taxBreakDown.discount.discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

          <View className="flex-row justify-between">
            <Text className="text-xl text-stone-300">PST (6%)</Text>
            <Text className="text-xl text-stone-300">
              ${taxBreakDown.pst.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xl text-stone-300">GST (5%)</Text>
            <Text className="text-xl text-stone-300">
              ${taxBreakDown.gst.toFixed(2)}
            </Text>
          </View>

          <View className="mt-2 flex-row justify-between border-t border-stone-700 pt-3">
            <Text className="text-3xl font-bold text-white">Total</Text>
            <Text className="text-3xl font-bold text-white">
              ${taxBreakDown.total.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
