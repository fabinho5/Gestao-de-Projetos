import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Header from "../(shared)/Header";
import { getUserFavorites, ApiError } from "../(services)/favoritesService";

export default function HomeScreen() {
    const [showFavorites, setShowFavorites] = useState(false);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 🔹 Handler para ver perfil
    const handleProfilePress = () => {
        router.push("/profile");
    };

    // 🔹 Handler para logout
    const handleLogoutPress = () => {
        router.replace("/login");
    };

    // ⭐ Handler para carregar favoritos
    const handleLoadFavorites = async () => {
        if (showFavorites) {
            setShowFavorites(false);
            setErrorMessage(null);
            return;
        }

        try {
            setLoadingFavorites(true);
            setErrorMessage(null);
            const favoritesData = await getUserFavorites();
            setFavorites(favoritesData);
            setShowFavorites(true);
        } catch (err) {
            const apiError = err as ApiError;
            setErrorMessage(apiError.message);
            setShowFavorites(false);
        } finally {
            setLoadingFavorites(false);
        }
    };

    // 🔹 Handler para abrir detalhes da peça
    const handlePartPress = (refInternal: string) => {
        router.push(`/Parts/${refInternal}`);
    };

    // 💰 Formatar preço com segurança
    const formatPrice = (price: any): string => {
        if (price === null || price === undefined) return "N/A";
        const numPrice = typeof price === "string" ? parseFloat(price) : price;
        if (isNaN(numPrice)) return "N/A";
        return `${numPrice.toFixed(2)} €`;
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* 🔹 Header */}
            <Header
                onProfilePress={handleProfilePress}
                onLogoutPress={handleLogoutPress}
            />

            {/* ⭐ Botão de Favoritos */}
            <View className="mx-4 mt-4">
                <TouchableOpacity
                    className={`flex-row items-center justify-center px-4 py-3 rounded-xl shadow-sm ${
                        showFavorites ? "bg-yellow-500" : "bg-blue-500"
                    }`}
                    onPress={handleLoadFavorites}
                    disabled={loadingFavorites}
                >
                    {loadingFavorites ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons
                                name={showFavorites ? "heart" : "heart-outline"}
                                size={22}
                                color="#fff"
                            />
                            <Text className="ml-2 text-white font-semibold text-base">
                                {showFavorites ? "Ocultar Favoritos" : "Ver Favoritos"}
                            </Text>

                            {!showFavorites && favorites.length > 0 && (
                                <View className="ml-2 bg-white rounded-full px-2 py-0.5">
                                    <Text className="text-blue-500 font-bold text-xs">
                                        {favorites.length}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* ⚠️ Mensagem de Erro */}
            {errorMessage && (
                <View className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <View className="flex-row items-center">
                        <Ionicons name="alert-circle" size={20} color="#ef4444" />
                        <Text className="ml-2 text-red-600 font-medium flex-1">
                            {errorMessage}
                        </Text>
                        <TouchableOpacity onPress={() => setErrorMessage(null)}>
                            <Ionicons name="close" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ⭐ Resultados (apenas Favoritos) */}
            <View className="flex-1 mt-4 px-4">
                {showFavorites && (
                    favorites.length === 0 ? (
                        <View className="flex-1 justify-center items-center">
                            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
                            <Text className="text-gray-400 text-center mt-4 text-lg">
                                Não tens favoritos ainda
                            </Text>
                            <Text className="text-gray-400 text-center mt-2">
                                Adiciona peças aos favoritos para vê-las aqui
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={favorites}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="bg-yellow-50 border border-yellow-200 p-4 mb-3 rounded-xl"
                                    onPress={() => handlePartPress(item.refInternal)}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="heart" size={18} color="#eab308" />
                                        <Text className="ml-2 text-xs text-yellow-600 font-semibold">
                                            FAVORITO
                                        </Text>
                                    </View>

                                    <Text className="text-lg font-semibold text-gray-800">
                                        {item.name || "Sem nome"}
                                    </Text>
                                    <Text className="text-gray-500 text-sm mt-1">
                                        Ref: {item.refInternal || "N/A"}
                                    </Text>
                                    <Text className="text-gray-500 text-sm">
                                        Categoria: {item.category?.name || "N/A"}
                                    </Text>
                                    <Text className="text-blue-600 font-bold text-lg mt-2">
                                        {formatPrice(item.price)}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    )
                )}
            </View>
        </SafeAreaView>
    );
}