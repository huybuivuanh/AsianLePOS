import React from "react";
import { Text, View } from "react-native";
import type { OrderItemDisplayTier } from "../orderItemSections";

const RAIL: Record<OrderItemDisplayTier, string> = {
  0: "border-l-[6px] border-amber-700 bg-amber-300",
  1: "border-l-[6px] border-slate-700 bg-slate-300",
  2: "border-l-[6px] border-teal-800 bg-teal-300",
};

const TITLE: Record<OrderItemDisplayTier, string> = {
  0: "text-amber-950",
  1: "text-slate-950",
  2: "text-teal-950",
};

type Props = {
  title: string;
  tier: OrderItemDisplayTier;
  isFirst: boolean;
};

/**
 * Section divider: colored left rail + soft tint (tier = appetizers / table / to-go).
 */
export default function OrderSectionHeader({ title, tier, isFirst }: Props) {
  return (
    <View
      className={`mb-3 max-w-[240px] self-start rounded-2xl border border-black/10 px-4 py-2.5 shadow-sm ${RAIL[tier]} ${
        isFirst ? "" : "mt-8"
      }`}
    >
      <Text className={`text-[17px] font-bold tracking-tight ${TITLE[tier]}`}>
        {title}
      </Text>
    </View>
  );
}
