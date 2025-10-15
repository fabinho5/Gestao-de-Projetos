import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        if (!email || !password) {
            Alert.alert("Erro", "Por favor preenche todos os campos.");
            return;
        }
        router.push("/home");
    };

    return (
        <SafeAreaView className="flex-1 justify-center items-center bg-white px-6">
            <View className="w-full max-w-sm">
                <Text className="text-3xl font-bold text-center text-gray-800 mb-8">
                    Iniciar Sessão
                </Text>

                <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
                    placeholder="Email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
                    placeholder="Palavra-passe"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    onPress={handleLogin}
                    className="bg-blue-600 rounded-lg py-3"
                >
                    <Text className="text-white text-center text-lg font-semibold">
                        Entrar
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}