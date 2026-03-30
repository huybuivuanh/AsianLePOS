import { X } from "lucide-react-native";
import React from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CategoryGrid from "./CategoryGrid";
import SearchResults from "./SearchResults";

export type MenuPickerBodyProps = {
  query: string;
  debouncedQuery: string;
  searching: boolean;
  onQueryChange: (text: string) => void;
  onClearSearch: () => void;
  searchItems: MenuItem[];
  onSelectSearchItem: (item: MenuItem) => void;
  categories: FoodCategory[];
  onSelectCategory: (category: FoodCategory) => void;
  /** Outer wrapper around grid/results (e.g. "-mx-4" to align with screen padding) */
  listWrapperClassName?: string;
};

export default function MenuPickerBody({
  query,
  debouncedQuery,
  searching,
  onQueryChange,
  onClearSearch,
  searchItems,
  onSelectSearchItem,
  categories,
  onSelectCategory,
  listWrapperClassName = "-mx-4",
}: MenuPickerBodyProps) {
  return (
    <>
      <View className="relative mb-4">
        <TextInput
          placeholder="Search menu items..."
          value={query}
          onChangeText={onQueryChange}
          className="border border-gray-300 rounded-lg p-3 pr-12"
          returnKeyLabel="Hide"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={onClearSearch}
          disabled={query.length === 0}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
            query.length === 0 ? "opacity-30" : ""
          }`}
        >
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View className={`flex-1 ${listWrapperClassName}`}>
        {searching ? (
          <SearchResults
            items={searchItems}
            query={debouncedQuery}
            onSelectItem={onSelectSearchItem}
          />
        ) : (
          <CategoryGrid
            categories={categories}
            onSelectCategory={onSelectCategory}
          />
        )}
      </View>
    </>
  );
}
