import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SearchBarProps = {
  placeholder?: string;
  onSearch?: (text: string) => void;
  onChangeText?: (text: string) => void;
};

export default function SearchBar({
  placeholder = "Pesquisar peÃ§as...",
  onSearch,
  onChangeText,
}: SearchBarProps) {
  const [searchText, setSearchText] = useState("");

  const handleChangeText = (text: string) => {
    setSearchText(text);
    onChangeText?.(text);
  };

  const handleSearch = () => {
    console.log("Pesquisa realizada:", searchText);
    onSearch?.(searchText);
  };

  const handleClear = () => {
    setSearchText("");
    onChangeText?.("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={searchText}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.7}
            style={styles.clearButton}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});