import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Por favor preenche todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
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
        Alert.alert('Sucesso', `Bem-vindo, ${data.user.fullName}!`);
      } else {
        Alert.alert('Erro', data.message || 'Credenciais inválidas');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor');
      console.error(error);
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
              <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-6">
                <Ionicons name="car-sport" size={48} color="#3b82f6" />
              </View>
              
              <Text className="text-4xl font-bold text-gray-800 mb-2">
                FUNDAPEÇAS
              </Text>
              <Text className="text-base text-gray-500">
                Sistema de Gestão de Peças
              </Text>
            </View>

            {/* Form */}
            <View className="w-full max-w-sm">
              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Email
                </Text>
                <View className="flex-row items-center bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-800"
                    placeholder="admin@fundapecas.pt"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
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
                    placeholder="••••••"
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

            {/* Footer */}
            <View className="mt-12">
              <Text className="text-sm text-gray-400 text-center">
                © 2024 Fundapeças. Todos os direitos reservados.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}