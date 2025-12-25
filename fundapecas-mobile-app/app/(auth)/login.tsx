import { useState } from "react";
import { 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração da API
const API_URL = 'http://localhost:3002';

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleLogin = async () => {
        // Limpa mensagens anteriores
        setErrorMessage("");
        setSuccessMessage("");

        if (!username || !password) {
            setErrorMessage("Por favor preencha todos os campos.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Verificar se existe token na resposta
                const token = data.token || data.accessToken || data.access_token;
                
                if (!token) {
                    console.error('ERRO: Token não encontrado na resposta do backend!');
                    console.log('Estrutura da resposta:', Object.keys(data));
                    setErrorMessage("Erro: Token não recebido do servidor.");
                    return;
                }

                // Guardar token no AsyncStorage
                await AsyncStorage.setItem('userToken', token);
                console.log('Token guardado com sucesso:', token.substring(0, 20) + '...');
                
                // Verificar se foi mesmo guardado
                const savedToken = await AsyncStorage.getItem('userToken');
                console.log('Token verificado:', savedToken ? 'Existe' : 'Não existe');
                
                setSuccessMessage(`Bem-vindo, ${data.user?.fullName || username}!`);
                
                setTimeout(() => {
                    router.push("/home");
                }, 1500);
            } else {
                setErrorMessage("Credenciais inválidas. Verifique os seus dados.");
            }
        } catch (error) {
            setErrorMessage("Erro de conexão. Verifique se o servidor está ativo.");
            console.error('Erro no login:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-center items-center px-8">
                        {/* Logo */}
                        <View className="items-center mb-12">
                            <Image 
                                source={require('../../assets/images/fundapecas.png')}
                                style={{ width: 120, height: 120, marginBottom: 24 }}
                                resizeMode="contain"
                            />
                            
                            <Text className="text-4xl font-bold text-gray-800 mb-2">
                                FUNDAPEÇAS
                            </Text>
                            <Text className="text-base text-gray-500">
                                Sistema de Gestão de Peças
                            </Text>
                        </View>

                        {/* Form */}
                        <View className="w-full max-w-sm">
                            {/* Username Input */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">
                                    Username
                                </Text>
                                <View className="flex-row items-center bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                                    <Ionicons name="person-outline" size={20} color="#3b82f6" />
                                    <TextInput
                                        className="flex-1 ml-3 text-base text-gray-800"
                                        placeholder="Introduz o teu username"
                                        placeholderTextColor="#9ca3af"
                                        autoCapitalize="none"
                                        value={username}
                                        onChangeText={setUsername}
                                        editable={!loading}
                                    />
                                </View>
                            </View>

                            {/* Password Input */}
                            <View className="mb-6">
                                <Text className="text-sm font-medium text-gray-700 mb-2">
                                    Palavra-passe
                                </Text>
                                <View className="flex-row items-center bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                                    <Ionicons name="lock-closed-outline" size={20} color="#3b82f6" />
                                    <TextInput
                                        className="flex-1 ml-3 text-base text-gray-800"
                                        placeholder="Introduz a tua palavra-passe"
                                        placeholderTextColor="#9ca3af"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        editable={!loading}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                    >
                                        <Ionicons 
                                            name={showPassword ? "eye-outline" : "eye-off-outline"} 
                                            size={20} 
                                            color="#9ca3af" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Mensagem de Erro */}
                            {errorMessage ? (
                                <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                                    <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                                    <Text className="text-red-600 text-sm ml-2 flex-1">
                                        {errorMessage}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Mensagem de Sucesso */}
                            {successMessage ? (
                                <View className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
                                    <Text className="text-green-600 text-sm ml-2 flex-1">
                                        {successMessage}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Login Button */}
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={loading}
                                className={`bg-blue-600 rounded-xl py-4 items-center shadow-sm ${
                                    loading ? 'opacity-70' : ''
                                }`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white text-lg font-semibold">
                                        Entrar
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}