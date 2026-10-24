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
import { DiscountType } from "@/types/enums";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

export default function CustomerDisplayScreen() {
  const [order, setOrder] = useState<OrderDraft | undefined>(undefined);

  useEffect(() => {
    const channel = createCustomerDisplayChannel();
    if (!channel) return;

    channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      if (event.data?.type === "cart") setOrder(event.data.order);
    };
    // Ask the cashier window for the current cart — BroadcastChannel only
    // delivers messages sent after a listener attaches, so a fresh/reloaded
    // display otherwise starts blank until the next cart change.
    const message: CustomerDisplayMessage = { type: "hello" };
    channel.postMessage(message);

    return () => channel.close();
  }, []);

  const items = order?.orderItems ?? [];
  const taxBreakDown = order?.taxBreakDown;

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
          Welcome!
        </Text>
        <Text className="mt-4 text-center text-2xl text-stone-400">
          Your order will appear here
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-900 px-10 py-10">
      <View className="flex-1">
        {items.map((item, index) => (
          <View
            key={item.id ?? index}
            className="mb-4 border-b border-stone-700 pb-4"
          >
            <View className="flex-row items-baseline justify-between gap-4">
              <Text
                className="flex-1 text-3xl font-semibold text-white"
                numberOfLines={2}
              >
                <Text className="font-bold text-stone-400">
                  {item.quantity}
                </Text>
                <Text className="text-stone-500"> × </Text>
                {item.name}
              </Text>
              <Text className="text-3xl font-bold text-white">
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>

            {item.options && item.options.length > 0 && (
              <View className="mt-1.5 pl-1">
                {item.options.map((option, optIndex) => (
                  <Text key={optIndex} className="text-xl text-stone-400">
                    · {option.quantity > 1 ? `${option.quantity}× ` : ""}
                    {option.name}
                  </Text>
                ))}
              </View>
            )}

            {item.extras && item.extras.length > 0 && (
              <View className="mt-1.5 pl-1">
                {item.extras.map((extra, extraIndex) => (
                  <Text key={extraIndex} className="text-xl text-stone-400">
                    · Add {extra.description}
                  </Text>
                ))}
              </View>
            )}

            {item.changes && item.changes.length > 0 && (
              <View className="mt-1.5 pl-1">
                {item.changes.map((change, changeIndex) => (
                  <Text key={changeIndex} className="text-xl text-stone-400">
                    · {change.from} → {change.to}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {taxBreakDown && (
        <View className="border-t-2 border-stone-600 pt-4">
          <View className="flex-row justify-between">
            <Text className="text-2xl text-stone-300">Subtotal</Text>
            <Text className="text-2xl text-stone-300">
              ${taxBreakDown.subTotal.toFixed(2)}
            </Text>
          </View>

          {taxBreakDown.discount && taxBreakDown.discount.discountAmount > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-2xl text-stone-300">
                {taxBreakDown.discount.discountType === DiscountType.Percent
                  ? `Discount (${taxBreakDown.discount.discountValue}%)`
                  : `Discount ($${taxBreakDown.discount.discountValue.toFixed(2)})`}
              </Text>
              <Text className="text-2xl text-stone-300">
                -${taxBreakDown.discount.discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between">
            <Text className="text-2xl text-stone-300">PST (6%)</Text>
            <Text className="text-2xl text-stone-300">
              ${taxBreakDown.pst.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-2xl text-stone-300">GST (5%)</Text>
            <Text className="text-2xl text-stone-300">
              ${taxBreakDown.gst.toFixed(2)}
            </Text>
          </View>

          <View className="mt-2 flex-row justify-between border-t border-stone-700 pt-3">
            <Text className="text-4xl font-bold text-white">Total</Text>
            <Text className="text-4xl font-bold text-white">
              ${taxBreakDown.total.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
