import { useState, useEffect } from "react";
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ActivityIndicator,
    ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { 
    getProfile, 
    changePassword, 
    validatePassword,
    validatePasswordMatch,
    validatePasswordFields,
    getRoleName,
    formatDate,
    ApiError,
    UserProfile 
} from "../(services)/profileService";
import { logout } from "../(services)/authService";

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    
    // Dados do perfil
    const [profile, setProfile] = useState<UserProfile>({
        id: "",
        username: "",
        email: "",
        fullName: "",
        role: "",
        createdAt: "",
    });

    // Estado para alterar password
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);
        } catch (error) {
            const apiError = error as ApiError;
            setErrorMessage(apiError.message);
            
            // Se for erro 401, redireciona para login
            if (apiError.statusCode === 401) {
                setTimeout(() => router.replace("/(auth)/login"), 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setErrorMessage("");
        setSuccessMessage("");

        // Validação 1: Verificar se todos os campos estão preenchidos
        const fieldsValidation = validatePasswordFields(oldPassword, newPassword, confirmPassword);
        if (!fieldsValidation.valid) {
            setErrorMessage(fieldsValidation.message!);
            return;
        }

        // Validação 2: Verificar se as passwords coincidem
        const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
        if (!matchValidation.valid) {
            setErrorMessage(matchValidation.message!);
            return;
        }

        // Validação 3: Verificar força da password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            setErrorMessage(passwordValidation.message!);
            return;
        }

        setUpdating(true);

        try {
            await changePassword({ oldPassword, newPassword });
            
            setSuccessMessage("Password alterada com sucesso!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordForm(false);
            
            // Redireciona para login após 2 segundos
            setTimeout(() => {
                router.replace("/(auth)/login");
            }, 2000);
        } catch (error) {
            const apiError = error as ApiError;
            setErrorMessage(apiError.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.replace("/(auth)/login");
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            setErrorMessage("Não foi possível terminar a sessão");
        }
    };

    const resetPasswordForm = () => {
        setShowPasswordForm(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrorMessage("");
        setSuccessMessage("");
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-600 mt-4">A carregar perfil...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center px-4 py-4 border-b border-gray-200">
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        className="mr-4"
                    >
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-gray-800 flex-1">
                        Meu Perfil
                    </Text>
                    <TouchableOpacity onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#dc2626" />
                    </TouchableOpacity>
                </View>

                <View className="px-6 py-6">
                    {/* Avatar */}
                    <View className="items-center mb-8">
                        <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-3">
                            <Ionicons name="person" size={48} color="#3b82f6" />
                        </View>
                        <Text className="text-xl font-bold text-gray-800">
                            {profile.fullName || "Carregando..."}
                        </Text>
                        <View className="bg-blue-50 px-3 py-1 rounded-full mt-2">
                            <Text className="text-blue-600 text-sm font-medium">
                                {getRoleName(profile.role)}
                            </Text>
                        </View>
                    </View>

                    {/* Informações do Perfil */}
                    <View className="bg-gray-50 rounded-2xl p-4 mb-6">
                        <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
                            Informações da Conta
                        </Text>

                        {/* Username */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                <Ionicons name="person-outline" size={20} color="#3b82f6" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500">Username</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.username || "Não disponível"}
                                </Text>
                            </View>
                        </View>

                        {/* Email */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500">Email</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.email || "Não definido"}
                                </Text>
                            </View>
                        </View>

                        {/* Data de criação */}
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500">Membro desde</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.createdAt ? formatDate(profile.createdAt) : "N/A"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Mensagens */}
                    {errorMessage ? (
                        <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                            <Text className="text-red-600 text-sm ml-2 flex-1">
                                {errorMessage}
                            </Text>
                        </View>
                    ) : null}

                    {successMessage ? (
                        <View className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                            <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
                            <Text className="text-green-600 text-sm ml-2 flex-1">
                                {successMessage}
                            </Text>
                        </View>
                    ) : null}

                    {/* Botão Alterar Password */}
                    {!showPasswordForm ? (
                        <TouchableOpacity
                            testID="passwordchange-button"
                            onPress={() => setShowPasswordForm(true)}
                            className="bg-blue-600 rounded-xl py-4 items-center flex-row justify-center shadow-sm"
                        >
                            <Ionicons name="lock-closed-outline" size={20} color="white" />
                            <Text className="text-white text-base font-semibold ml-2">
                                Alterar Password
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="bg-gray-50 rounded-2xl p-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-base font-semibold text-gray-800">
                                    Alterar Password
                                </Text>
                                <TouchableOpacity onPress={resetPasswordForm}>
                                    <Ionicons name="close" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Password Atual */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">
                                    Password Atual
                                </Text>
                                <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-200">
                                    <Ionicons name="lock-closed-outline" size={20} color="#3b82f6" />
                                    <TextInput
                                        testID ="passwordatual-input"
                                        className="flex-1 ml-3 text-base text-gray-800"
                                        placeholder="Password atual"
                                        placeholderTextColor="#9ca3af"
                                        secureTextEntry={!showOldPassword}
                                        value={oldPassword}
                                        onChangeText={setOldPassword}
                                        editable={!updating}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowOldPassword(!showOldPassword)}
                                        disabled={updating}
                                    >
                                        <Ionicons 
                                            name={showOldPassword ? "eye-outline" : "eye-off-outline"} 
                                            size={20} 
                                            color="#9ca3af" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Nova Password */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">
                                    Nova Password
                                </Text>
                                <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-200">
                                    <Ionicons name="lock-closed-outline" size={20} color="#3b82f6" />
                                    <TextInput
                                        testID = "passwordnova-input"
                                        className="flex-1 ml-3 text-base text-gray-800"
                                        placeholder="Nova password"
                                        placeholderTextColor="#9ca3af"
                                        secureTextEntry={!showNewPassword}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        editable={!updating}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        disabled={updating}
                                    >
                                        <Ionicons 
                                            name={showNewPassword ? "eye-outline" : "eye-off-outline"} 
                                            size={20} 
                                            color="#9ca3af" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Confirmar Password */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">
                                    Confirmar Nova Password
                                </Text>
                                <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-200">
                                    <Ionicons name="lock-closed-outline" size={20} color="#3b82f6" />
                                    <TextInput
                                        testID ="passwordnovaconfirm-input"
                                        className="flex-1 ml-3 text-base text-gray-800"
                                        placeholder="Confirmar password"
                                        placeholderTextColor="#9ca3af"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        editable={!updating}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={updating}
                                    >
                                        <Ionicons 
                                            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                                            size={20} 
                                            color="#9ca3af" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Requisitos da Password */}
                            <View className="bg-blue-50 rounded-lg p-3 mb-4">
                                <Text className="text-xs font-medium text-blue-900 mb-2">
                                    Requisitos da password:
                                </Text>
                                <Text className="text-xs text-blue-700">
                                    • Mínimo 6 caracteres
                                </Text>
                                <Text className="text-xs text-blue-700">
                                    • Pelo menos uma letra minúscula
                                </Text>
                                <Text className="text-xs text-blue-700">
                                    • Pelo menos uma letra maiúscula
                                </Text>
                                <Text className="text-xs text-blue-700">
                                    • Pelo menos um número
                                </Text>
                            </View>

                            {/* Botão Confirmar */}
                            <TouchableOpacity
                                testID="passwordchangeconfirmation-button"
                                onPress={handleChangePassword}
                                disabled={updating}
                                className={`bg-blue-600 rounded-xl py-4 items-center shadow-sm ${
                                    updating ? 'opacity-70' : ''
                                }`}
                            >
                                {updating ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white text-base font-semibold">
                                        Confirmar Alteração
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}