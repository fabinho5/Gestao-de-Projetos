import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, FlatList } from "react-native";

export default function OrdersScreen() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-4">
                <Text className="text-2xl font-bold text-gray-800 mb-4 text-center">
                    Pedidos Pendentes
                </Text>


            </View>
        </SafeAreaView>
    );
}