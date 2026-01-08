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

interface EditStatusModal {
    visible: boolean;
    reservation: Reservation | null;
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
    const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | 'ALL'>('ALL');
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
    const [editStatusModal, setEditStatusModal] = useState<EditStatusModal>({
        visible: false,
        reservation: null,
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

    // Atualizar filtro de pesquisa e status
    useEffect(() => {
        let filtered = allReservations;

        // Filtrar por status
        if (selectedStatus !== 'ALL') {
            filtered = filtered.filter(r => r.status === selectedStatus);
        }

        // Filtrar por pesquisa
        if (searchQuery.trim() !== '') {
            filtered = filtered.filter(reservation =>
                reservation.part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reservation.part.refInternal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reservation.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reservation.id.toString().includes(searchQuery)
            );
        }

        setFilteredReservations(filtered);
    }, [searchQuery, allReservations, selectedStatus]);

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
        setSelectedStatus('ALL');
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

    const handleEditStatus = (reservation: Reservation) => {
        setEditStatusModal({
            visible: true,
            reservation,
        });
    };

    const handleUpdateStatusFromModal = async (reservationId: number, newStatus: ReservationStatus) => {
        try {
            await updateReservationStatus(reservationId, newStatus);
            showToast('Status atualizado com sucesso', 'success');
            loadReservations();
            setEditStatusModal({ visible: false, reservation: null });
        } catch (err) {
            const apiError = err as ApiError;
            showToast(apiError.message, 'error');
        }
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

    const getStatusCount = (status: ReservationStatus): number => {
        return allReservations.filter(r => r.status === status).length;
    };

    const renderReservationCard = (reservation: Reservation) => {
        const statusColor = getStatusColor(reservation.status);
        const statusName = getStatusName(reservation.status);

        return (
            <View key={reservation.id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.reservationId}>#{reservation.id}</Text>
                        <TouchableOpacity
                            style={[styles.statusBadge, { backgroundColor: statusColor }]}
                            onPress={() => handleEditStatus(reservation)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.statusText}>{statusName}</Text>
                            <Ionicons name="create-outline" size={14} color="#fff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
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

    const statuses: (ReservationStatus | 'ALL')[] = [
        'ALL',
        'PENDING',
        'IN_PREPARATION',
        'READY_TO_SHIP',
        'COMPLETED',
        'CONFIRMED',
        'CANCELLED',
    ];

    return (
        <View style={styles.container}>
            <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />
            
            <SearchBar
                placeholder="Pesquisar pedidos..."
                onSearch={handleSearch}
                onChangeText={handleSearch}
            />

            {/* Tabs e Status juntos numa linha com scroll horizontal */}
            <View style={styles.tabsAndStatusContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsAndStatusContent}
                >
                    {/* Tabs */}

                    {userRole === 'WAREHOUSE' && (
                        <>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                                onPress={() => handleTabChange('pending')}
                            >
                                <Ionicons 
                                    name="time-outline" 
                                    size={18} 
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
                                    size={18} 
                                    color={activeTab === 'myAssigned' ? '#3b82f6' : '#6b7280'} 
                                />
                                <Text style={[styles.tabText, activeTab === 'myAssigned' && styles.tabTextActive]}>
                                    Minhas
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Separador vertical */}
                    <View style={styles.separator} />

                    {/* Status filters */}
                    {statuses.map((status) => {
                        const isActive = selectedStatus === status;
                        const count = status === 'ALL' 
                            ? allReservations.length 
                            : getStatusCount(status as ReservationStatus);
                        
                        const backgroundColor = status === 'ALL' 
                            ? (isActive ? '#6b7280' : '#f3f4f6')
                            : (isActive ? getStatusColor(status as ReservationStatus) : '#fff');
                        
                        const borderColor = status === 'ALL' 
                            ? '#6b7280'
                            : getStatusColor(status as ReservationStatus);
                        
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusFilterChip,
                                    {
                                        backgroundColor,
                                        borderColor,
                                    }
                                ]}
                                onPress={() => setSelectedStatus(status)}
                            >
                                <Text style={[
                                    styles.statusFilterText,
                                    { color: isActive ? '#fff' : '#374151' }
                                ]}>
                                    {status === 'ALL' ? 'Todos' : getStatusName(status as ReservationStatus)}
                                </Text>
                                <View style={[
                                    styles.statusFilterBadge,
                                    { backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : '#f3f4f6' }
                                ]}>
                                    <Text style={[
                                        styles.statusFilterBadgeText,
                                        { color: isActive ? '#fff' : '#6b7280' }
                                    ]}>
                                        {count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
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
                            {searchQuery || selectedStatus !== 'ALL' 
                                ? 'Nenhum pedido encontrado' 
                                : 'Nenhum pedido disponível'}
                        </Text>
                    </View>
                ) : (
                    filteredReservations.map(renderReservationCard)
                )}
            </ScrollView>

            {/* Modal de Edição de Status */}
            <Modal
                transparent
                visible={editStatusModal.visible}
                animationType="fade"
                onRequestClose={() => setEditStatusModal({ visible: false, reservation: null })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Alterar Status</Text>
                        <Text style={styles.modalMessage}>
                            Reserva #{editStatusModal.reservation?.id}
                        </Text>
                        
                        <View style={styles.statusOptionsContainer}>
                            {(['PENDING', 'IN_PREPARATION', 'READY_TO_SHIP', 'COMPLETED', 'CONFIRMED'] as ReservationStatus[]).map((status) => {
                                const isCurrentStatus = editStatusModal.reservation?.status === status;
                                const statusColor = getStatusColor(status);
                                
                                return (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusOption,
                                            { borderColor: statusColor },
                                            isCurrentStatus && { backgroundColor: statusColor }
                                        ]}
                                        onPress={() => {
                                            if (editStatusModal.reservation && !isCurrentStatus) {
                                                handleUpdateStatusFromModal(editStatusModal.reservation.id, status);
                                            }
                                        }}
                                        disabled={isCurrentStatus}
                                    >
                                        <Text style={[
                                            styles.statusOptionText,
                                            isCurrentStatus && styles.statusOptionTextActive
                                        ]}>
                                            {getStatusName(status)}
                                        </Text>
                                        {isCurrentStatus && (
                                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 12 }]}
                            onPress={() => setEditStatusModal({ visible: false, reservation: null })}
                        >
                            <Text style={styles.modalButtonTextCancel}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
    tabsAndStatusContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tabsAndStatusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        marginRight: 8,
    },
    tabActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#3b82f6',
    },
    separator: {
        width: 1,
        height: 24,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 8,
    },
    statusFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 2,
        marginRight: 8,
    },
    statusFilterText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusFilterBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    statusFilterBadgeText: {
        fontSize: 11,
        fontWeight: '700',
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
        flexDirection: 'row',
        alignItems: 'center',
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
    assignButton: {
        backgroundColor: '#3b82f6',
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
    statusOptionsContainer: {
        gap: 10,
        marginBottom: 12,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 10,
        borderWidth: 2,
        backgroundColor: '#fff',
    },
    statusOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    statusOptionTextActive: {
        color: '#fff',
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

export default Orders;