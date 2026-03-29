import SafeAreaViewWrapper from "@/components/layout/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import React from "react";
import { View } from "react-native";
import SearchResults from "./SearchResults";

type Props = {
  title: string;
  items: MenuItem[];
  onBack: () => void;
  onSelectItem: (item: MenuItem) => void;
};

export default function CategoryItemsView({
  title,
  items,
  onBack,
  onSelectItem,
}: Props) {
  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title={title} onBack={onBack} />
      <View className="flex-1 pt-2">
        <SearchResults items={items} query="" onSelectItem={onSelectItem} />
      </View>
    </SafeAreaViewWrapper>
  );
}
