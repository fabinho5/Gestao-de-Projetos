import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../(shared)/Header';
import SearchBar from '../(shared)/SearchBar';
import {
    getAllReservations,
    getPendingReservations,
    getMyAssignedReservations,
    assignReservation,
    updateReservationStatus,
    cancelReservation,
    getStatusColor,
    getStatusName,
    formatDate,
    Reservation,
    ReservationStatus,
    CancelReason,
    ApiError,
} from '../(services)/reservationsService';

type FilterTab = 'all' | 'pending' | 'myAssigned';

interface ConfirmationModal {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'danger';
}

interface CancelModal {
    visible: boolean;
    reservationId: number | null;
    currentStatus: ReservationStatus | null;
}

const Orders = () => {
    const router = useRouter();
    const [allReservations, setAllReservations] = useState<Reservation[]>([]);
    const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<ConfirmationModal>({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });
    const [cancelModal, setCancelModal] = useState<CancelModal>({
        visible: false,
        reservationId: null,
        currentStatus: null,
    });
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Carregar role do utilizador
    useEffect(() => {
        loadUserRole();
    }, []);

    // Carregar reservas ao montar o componente e quando a tela receber foco
    useFocusEffect(
        useCallback(() => {
            loadReservations();
        }, [activeTab])
    );

    // Atualizar filtro de pesquisa
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredReservations(allReservations);
        } else {
            const filtered = allReservations.filter(reservation =>
                reservation.part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reservation.part.refInternal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reservation.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reservation.id.toString().includes(searchQuery)
            );
            setFilteredReservations(filtered);
        }
    }, [searchQuery, allReservations]);

    // Auto-hide toast
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

    const loadUserRole = async () => {
        try {
            const role = await AsyncStorage.getItem('userRole');
            setUserRole(role);
        } catch (error) {
            console.error('Erro ao carregar role:', error);
        }
    };

    const loadReservations = async () => {
        try {
            setLoading(true);
            setError(null);

            let reservations: Reservation[] = [];

            switch (activeTab) {
                case 'pending':
                    reservations = await getPendingReservations();
                    break;
                case 'myAssigned':
                    reservations = await getMyAssignedReservations();
                    break;
                default:
                    reservations = await getAllReservations();
            }

            setAllReservations(reservations);
            setFilteredReservations(reservations);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadReservations();
        setRefreshing(false);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
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

    const handleTabChange = (tab: FilterTab) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const handleCreateOrder = () => {
        router.push('/Orders/createOrder');
    };

    const handleAssignReservation = async (reservationId: number) => {
        setConfirmModal({
            visible: true,
            title: 'Atribuir Reserva',
            message: 'Deseja assumir a preparação desta reserva?',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                try {
                    await assignReservation(reservationId);
                    showToast('Reserva atribuída com sucesso', 'success');
                    loadReservations();
                } catch (err) {
                    const apiError = err as ApiError;
                    showToast(apiError.message, 'error');
                }
                setConfirmModal({ ...confirmModal, visible: false });
            },
        });
    };

    const handleUpdateStatus = async (reservationId: number, newStatus: ReservationStatus) => {
        const statusNames: Record<ReservationStatus, string> = {
            PENDING: 'Pendente',
            IN_PREPARATION: 'Em Preparação',
            READY_TO_SHIP: 'Pronto para Envio',
            COMPLETED: 'Concluído',
            CONFIRMED: 'Confirmado',
            CANCELLED: 'Cancelado',
        };

        setConfirmModal({
            visible: true,
            title: 'Atualizar Status',
            message: `Deseja marcar esta reserva como "${statusNames[newStatus]}"?`,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                try {
                    await updateReservationStatus(reservationId, newStatus);
                    showToast('Status atualizado com sucesso', 'success');
                    loadReservations();
                } catch (err) {
                    const apiError = err as ApiError;
                    showToast(apiError.message, 'error');
                }
                setConfirmModal({ ...confirmModal, visible: false });
            },
        });
    };

    const handleCancelReservation = async (reservationId: number, currentStatus: ReservationStatus) => {
        setCancelModal({
            visible: true,
            reservationId,
            currentStatus,
        });
    };

    const handleCancelWithReason = async (reservationId: number, reason: CancelReason) => {
        try {
            await cancelReservation(reservationId, { cancelReason: reason });
            showToast('Reserva cancelada com sucesso', 'success');
            loadReservations();
        } catch (err) {
            const apiError = err as ApiError;
            showToast(apiError.message, 'error');
        }
        setCancelModal({ visible: false, reservationId: null, currentStatus: null });
    };

    const renderReservationCard = (reservation: Reservation) => {
        const statusColor = getStatusColor(reservation.status);
        const statusName = getStatusName(reservation.status);

        return (
            <View key={reservation.id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.reservationId}>#{reservation.id}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={styles.statusText}>{statusName}</Text>
                        </View>
                    </View>
                    <Text style={styles.dateText}>{formatDate(reservation.createdAt)}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="cube-outline" size={16} color="#6b7280" />
                        <Text style={styles.infoLabel}>Peça:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                            {reservation.part.name}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="barcode-outline" size={16} color="#6b7280" />
                        <Text style={styles.infoLabel}>Ref:</Text>
                        <Text style={styles.infoValue}>{reservation.part.refInternal}</Text>
                    </View>

                    {reservation.part.location && (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={16} color="#6b7280" />
                            <Text style={styles.infoLabel}>Localização:</Text>
                            <Text style={styles.infoValue}>{reservation.part.location.fullCode}</Text>
                        </View>
                    )}

                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={16} color="#6b7280" />
                        <Text style={styles.infoLabel}>Solicitado por:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                            {reservation.user.fullName}
                        </Text>
                    </View>

                    {reservation.assignedTo && (
                        <View style={styles.infoRow}>
                            <Ionicons name="person-circle-outline" size={16} color="#6b7280" />
                            <Text style={styles.infoLabel}>Atribuído a:</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>
                                {reservation.assignedTo.fullName}
                            </Text>
                        </View>
                    )}

                    {reservation.notes && (
                        <View style={styles.notesContainer}>
                            <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                            <Text style={styles.notesText}>{reservation.notes}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardActions}>
                    {userRole === 'WAREHOUSE' && 
                     reservation.status === 'PENDING' && 
                     !reservation.assignedToId && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.assignButton]}
                            onPress={() => handleAssignReservation(reservation.id)}
                        >
                            <Ionicons name="hand-left-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Assumir</Text>
                        </TouchableOpacity>
                    )}

                    {userRole === 'WAREHOUSE' && 
                     reservation.status === 'IN_PREPARATION' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.readyButton]}
                            onPress={() => handleUpdateStatus(reservation.id, 'READY_TO_SHIP')}
                        >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Pronto</Text>
                        </TouchableOpacity>
                    )}

                    {userRole === 'WAREHOUSE' && 
                     reservation.status === 'READY_TO_SHIP' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton]}
                            onPress={() => handleUpdateStatus(reservation.id, 'COMPLETED')}
                        >
                            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Concluir</Text>
                        </TouchableOpacity>
                    )}

                    {reservation.status !== 'CANCELLED' && 
                     reservation.status !== 'CONFIRMED' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={() => handleCancelReservation(reservation.id, reservation.status)}
                        >
                            <Ionicons name="close-circle-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <>
                <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Carregando pedidos...</Text>
                </View>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadReservations}>
                        <Text style={styles.retryButtonText}>Tentar novamente</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    }

    return (
        <View style={styles.container}>
            <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />
            
            <SearchBar
                placeholder="Pesquisar pedidos..."
                onSearch={handleSearch}
                onChangeText={handleSearch}
            />

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                    onPress={() => handleTabChange('all')}
                >
                    <Ionicons 
                        name="list-outline" 
                        size={20} 
                        color={activeTab === 'all' ? '#3b82f6' : '#6b7280'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                        Todos
                    </Text>
                </TouchableOpacity>

                {userRole === 'WAREHOUSE' && (
                    <>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                            onPress={() => handleTabChange('pending')}
                        >
                            <Ionicons 
                                name="time-outline" 
                                size={20} 
                                color={activeTab === 'pending' ? '#3b82f6' : '#6b7280'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                                Pendentes
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'myAssigned' && styles.tabActive]}
                            onPress={() => handleTabChange('myAssigned')}
                        >
                            <Ionicons 
                                name="person-outline" 
                                size={20} 
                                color={activeTab === 'myAssigned' ? '#3b82f6' : '#6b7280'} 
                            />
                            <Text style={[styles.tabText, activeTab === 'myAssigned' && styles.tabTextActive]}>
                                Minhas
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    {filteredReservations.length} {filteredReservations.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                </Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {filteredReservations.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="basket-outline" size={64} color="#9ca3af" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Nenhum pedido encontrado' : 'Nenhum pedido disponível'}
                        </Text>
                    </View>
                ) : (
                    filteredReservations.map(renderReservationCard)
                )}
            </ScrollView>

            {/* Botão Flutuante para Criar Pedido */}
            <TouchableOpacity
                style={styles.fab}
                onPress={handleCreateOrder}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Modal de Confirmação */}
            <Modal
                transparent
                visible={confirmModal.visible}
                animationType="fade"
                onRequestClose={() => setConfirmModal({ ...confirmModal, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{confirmModal.title}</Text>
                        <Text style={styles.modalMessage}>{confirmModal.message}</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setConfirmModal({ ...confirmModal, visible: false })}
                            >
                                <Text style={styles.modalButtonTextCancel}>
                                    {confirmModal.cancelText || 'Cancelar'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={confirmModal.onConfirm}
                            >
                                <Text style={styles.modalButtonTextConfirm}>
                                    {confirmModal.confirmText || 'Confirmar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Cancelamento */}
            <Modal
                transparent
                visible={cancelModal.visible}
                animationType="fade"
                onRequestClose={() => setCancelModal({ visible: false, reservationId: null, currentStatus: null })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Cancelar Reserva</Text>
                        <Text style={styles.modalMessage}>
                            {cancelModal.currentStatus === 'COMPLETED'
                                ? 'Esta reserva já foi concluída. Selecione o motivo do cancelamento:'
                                : 'Selecione o motivo do cancelamento:'}
                        </Text>
                        
                        {/* Botões de razão de cancelamento */}
                        <View style={styles.cancelReasonButtons}>
                            {cancelModal.currentStatus === 'COMPLETED' ? (
                                <>
                                    <TouchableOpacity
                                        style={[styles.reasonButton, styles.reasonButtonReturn]}
                                        onPress={() => handleCancelWithReason(cancelModal.reservationId!, 'RETURN')}
                                    >
                                        <Ionicons name="return-down-back" size={20} color="#fff" />
                                        <Text style={styles.reasonButtonText}>Devolução Normal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.reasonButton, styles.reasonButtonDamaged]}
                                        onPress={() => handleCancelWithReason(cancelModal.reservationId!, 'DAMAGED_RETURN')}
                                    >
                                        <Ionicons name="warning" size={20} color="#fff" />
                                        <Text style={styles.reasonButtonText}>Devolução Danificada</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.reasonButton, styles.reasonButtonDesist]}
                                    onPress={() => handleCancelWithReason(cancelModal.reservationId!, 'DESIST')}
                                >
                                    <Ionicons name="close-circle" size={20} color="#fff" />
                                    <Text style={styles.reasonButtonText}>Desistência</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Botão Voltar */}
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 12 }]}
                            onPress={() => setCancelModal({ visible: false, reservationId: null, currentStatus: null })}
                        >
                            <Text style={styles.modalButtonTextCancel}>Voltar</Text>
                        </TouchableOpacity>
                    </View>
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
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingHorizontal: 16,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#3b82f6',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    statsText: {
        fontSize: 14,
        color: '#6b7280',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reservationId: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    dateText: {
        fontSize: 12,
        color: '#6b7280',
    },
    cardBody: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
        flex: 1,
    },
    notesContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
    },
    notesText: {
        fontSize: 13,
        color: '#4b5563',
        flex: 1,
        lineHeight: 20,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        padding: 16,
        paddingTop: 0,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    cancelReasonButtons: {
        gap: 12,
        marginTop: 8,
    },
    reasonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        width: '100%',
    },
    reasonButtonReturn: {
        backgroundColor: '#3b82f6',
    },
    reasonButtonDamaged: {
        backgroundColor: '#ef4444',
    },
    reasonButtonDesist: {
        backgroundColor: '#f59e0b',
    },
    reasonButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    assignButton: {
        backgroundColor: '#3b82f6',
    },
    readyButton: {
        backgroundColor: '#8b5cf6',
    },
    completeButton: {
        backgroundColor: '#10b981',
    },
    cancelButton: {
        backgroundColor: '#ef4444',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    modalMessage: {
        fontSize: 16,
        color: '#6b7280',
        lineHeight: 24,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    modalButton: {
        flex: 1,
        minWidth: 100,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#f3f4f6',
    },
    modalButtonConfirm: {
        backgroundColor: '#3b82f6',
    },
    modalButtonDanger: {
        backgroundColor: '#ef4444',
    },
    modalButtonTextCancel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    modalButtonTextConfirm: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    toast: {
        position: 'absolute',
        bottom: 100,
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

export default Orders;