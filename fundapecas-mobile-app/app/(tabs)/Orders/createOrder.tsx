import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from '../../(shared)/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createReservation,
    CreateReservationData,
    ApiError,
} from '../../(services)/reservationsService';

interface Part {
    id: number;
    name: string;
    refInternal: string;
    location?: {
        id: number;
        fullCode: string;
    };
}

const CreateOrder = () => {
    const router = useRouter();
    const [parts, setParts] = useState<Part[]>([]);
    const [filteredParts, setFilteredParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPart, setSelectedPart] = useState<Part | null>(null);
    const [notes, setNotes] = useState('');
    const [showPartSelector, setShowPartSelector] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        loadParts();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredParts(parts);
        } else {
            const filtered = parts.filter(part =>
                part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                part.refInternal.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredParts(filtered);
        }
    }, [searchQuery, parts]);

    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => {
                setToast({ ...toast, visible: false });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const loadParts = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                showToast('Token não encontrado. Faça login novamente.', 'error');
                router.replace('/login');
                return;
            }

            const response = await fetch('http://localhost:3002/parts', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar peças');
            }

            const data = await response.json();
            setParts(data);
            setFilteredParts(data);
        } catch (error) {
            console.error('Erro ao carregar peças:', error);
            showToast('Erro ao carregar peças', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProfilePress = () => {
        router.push('/profile');
    };

    const handleLogoutPress = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            router.replace('/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleSelectPart = (part: Part) => {
        setSelectedPart(part);
        setShowPartSelector(false);
        setSearchQuery('');
    };

    const handleSubmit = async () => {
        if (!selectedPart) {
            showToast('Selecione uma peça', 'error');
            return;
        }

        try {
            setSubmitting(true);

            const data: CreateReservationData = {
                partId: selectedPart.id,
                notes: notes.trim() || undefined,
            };

            await createReservation(data);
            showToast('Pedido criado com sucesso!', 'success');
            
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (err) {
            const apiError = err as ApiError;
            showToast("Já existe um pedido em aberto para esta peça.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Carregando...</Text>
                </View>
            </>
        );
    }

    return (
        <View style={styles.container}>
            <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Criar Novo Pedido</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    {/* Seletor de Peça */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Peça <Text style={styles.required}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => setShowPartSelector(true)}
                        >
                            <View style={styles.selectButtonContent}>
                                {selectedPart ? (
                                    <>
                                        <Ionicons name="cube" size={20} color="#3b82f6" />
                                        <View style={styles.selectButtonText}>
                                            <Text style={styles.selectButtonTitle}>
                                                {selectedPart.name}
                                            </Text>
                                            <Text style={styles.selectButtonSubtitle}>
                                                Ref: {selectedPart.refInternal}
                                                {selectedPart.location && ` • ${selectedPart.location.fullCode}`}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="cube-outline" size={20} color="#9ca3af" />
                                        <Text style={styles.selectButtonPlaceholder}>
                                            Selecionar peça
                                        </Text>
                                    </>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Notas */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Notas (opcional)</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Adicione observações sobre o pedido..."
                            placeholderTextColor="#9ca3af"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Botão de Submit */}
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Criar Pedido</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Modal de Seleção de Peça */}
            <Modal
                visible={showPartSelector}
                animationType="slide"
                onRequestClose={() => setShowPartSelector(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setShowPartSelector(false)}
                            style={styles.modalCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Selecionar Peça</Text>
                        <View style={styles.placeholder} />
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar peças..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView style={styles.partsList}>
                        {filteredParts.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cube-outline" size={64} color="#9ca3af" />
                                <Text style={styles.emptyText}>Nenhuma peça encontrada</Text>
                            </View>
                        ) : (
                            filteredParts.map(part => (
                                <TouchableOpacity
                                    key={part.id}
                                    style={styles.partItem}
                                    onPress={() => handleSelectPart(part)}
                                >
                                    <View style={styles.partIcon}>
                                        <Ionicons name="cube" size={24} color="#3b82f6" />
                                    </View>
                                    <View style={styles.partInfo}>
                                        <Text style={styles.partName}>{part.name}</Text>
                                        <Text style={styles.partRef}>
                                            Ref: {part.refInternal}
                                            {part.location && ` • ${part.location.fullCode}`}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Toast */}
            {toast.visible && (
                <View style={[styles.toast, toast.type === 'error' && styles.toastError]}>
                    <Ionicons
                        name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.toastText}>{toast.message}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
    },
    form: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 16,
    },
    selectButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    selectButtonText: {
        flex: 1,
    },
    selectButtonTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    selectButtonSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    selectButtonPlaceholder: {
        fontSize: 15,
        color: '#9ca3af',
    },
    textArea: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#111827',
        minHeight: 120,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    partsList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    partItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    partIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    partInfo: {
        flex: 1,
    },
    partName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    partRef: {
        fontSize: 13,
        color: '#6b7280',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#9ca3af',
    },
    toast: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#10b981',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    toastError: {
        backgroundColor: '#ef4444',
    },
    toastText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
});

export default CreateOrder;