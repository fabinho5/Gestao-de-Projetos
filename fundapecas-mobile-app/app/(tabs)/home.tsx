import { useState } from "react";
import { View, TextInput, Text, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
    const [query, setQuery] = useState("");

    // 🔹 Dummy data (vai ser substituído por dados da BD/API)
    const parts = [
        { id: "1", name: "Filtro de Ar", category: "Motor" },
        { id: "2", name: "Pastilhas de Travão", category: "Travagem" },
        { id: "3", name: "Óleo 5W30", category: "Lubrificantes" },
    ];

    // 🔍 Pesquisa em tempo real
    const filteredParts = parts.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* 🔹 Barra de pesquisa */}
            <View className="flex-row items-center bg-gray-100 mx-4 mt-4 px-4 py-3 rounded-2xl shadow-sm">
                <Ionicons name="search" size={22} color="#64748b" />
                <TextInput
                    className="flex-1 ml-3 text-base text-gray-800"
                    placeholder="Pesquisar peças..."
                    placeholderTextColor="#9ca3af"
                    value={query}
                    onChangeText={setQuery}
                />
            </View>

            {/* 🔹 Resultados */}
            <View className="flex-1 mt-4 px-4">
                {query.length === 0 ? (
                    <Text className="text-gray-400 text-center mt-6">
                        Escreve o nome ou referência da peça
                    </Text>
                ) : filteredParts.length === 0 ? (
                    <Text className="text-gray-500 text-center mt-6">
                        Nenhuma peça encontrada 😕
                    </Text>
                ) : (
                    <FlatList
                        data={filteredParts}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="bg-gray-100 p-4 mb-3 rounded-xl"
                                onPress={() => console.log("Abrir peça:", item.id)}
                            >
                                <Text className="text-lg font-semibold text-gray-800">
                                    {item.name}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                    Categoria: {item.category}
                                </Text>
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}