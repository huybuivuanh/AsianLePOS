import { useFocusEffect } from "expo-router";
import { X } from "lucide-react-native";
import React, { useCallback, useRef } from "react";
import {
  Keyboard,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SearchResults from "./SearchResults";

export type MenuPickerBodyProps = {
  query: string;
  debouncedQuery: string;
  onQueryChange: (text: string) => void;
  onClearSearch: () => void;
  /** All items — shown filtered when a search query is active. */
  items: MenuItem[];
  /** Items shown when no query is active (e.g. first category). */
  browseItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  listWrapperClassName?: string;
};

export default function MenuPickerBody({
  query,
  debouncedQuery,
  onQueryChange,
  onClearSearch,
  items,
  browseItems,
  onSelectItem,
  listWrapperClassName = "-mx-4",
}: MenuPickerBodyProps) {
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <>
      <View className="relative mb-4">
        <TextInput
          ref={inputRef}
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
        <SearchResults
          items={debouncedQuery ? items : browseItems}
          query={debouncedQuery}
          onSelectItem={onSelectItem}
        />
      </View>
    </>
  );
}
