import React from "react";
import { Text } from "react-native";
import OrderItemCard from "./OrderItemCard";

type Props = {
  orderItems: OrderItem[] | undefined | null;
  emptyMessage?: string;
};

export default function OrderLinesList({
  orderItems,
  emptyMessage = "Your order is empty.",
}: Props) {
  if (!orderItems?.length) {
    return (
      <Text className="text-gray-500 text-center mt-10">{emptyMessage}</Text>
    );
  }

  return (
    <>
      {orderItems.map((item, index) => (
        <OrderItemCard key={`${item.id}-${index}`} item={item} />
      ))}
    </>
  );
}
