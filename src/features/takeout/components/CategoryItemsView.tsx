import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import Header from "@/ui/Header";
import React, { useMemo } from "react";
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
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );
  }, [items]);

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title={title} onBack={onBack} />
      <View className="flex-1 pt-2">
        <SearchResults
          items={sortedItems}
          query=""
          onSelectItem={onSelectItem}
        />
      </View>
    </SafeAreaViewWrapper>
  );
}
