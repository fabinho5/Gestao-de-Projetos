import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Alert,
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

    const handleAssignReservation = async (reservationId: number) => {
        Alert.alert(
            'Atribuir Reserva',
            'Deseja assumir a preparação desta reserva?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await assignReservation(reservationId);
                            Alert.alert('Sucesso', 'Reserva atribuída com sucesso');
                            loadReservations();
                        } catch (err) {
                            const apiError = err as ApiError;
                            Alert.alert('Erro', apiError.message);
                        }
                    },
                },
            ]
        );
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

        Alert.alert(
            'Atualizar Status',
            `Deseja marcar esta reserva como "${statusNames[newStatus]}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await updateReservationStatus(reservationId, newStatus);
                            Alert.alert('Sucesso', 'Status atualizado com sucesso');
                            loadReservations();
                        } catch (err) {
                            const apiError = err as ApiError;
                            Alert.alert('Erro', apiError.message);
                        }
                    },
                },
            ]
        );
    };

    const handleCancelReservation = async (reservationId: number, currentStatus: ReservationStatus) => {
        // Determinar o motivo baseado no status atual
        const isCompleted = currentStatus === 'COMPLETED';
        
        Alert.alert(
            'Cancelar Reserva',
            isCompleted 
                ? 'Esta reserva já foi concluída. Selecione o motivo do cancelamento:'
                : 'Tem certeza que deseja cancelar esta reserva?',
            isCompleted ? [
                { text: 'Voltar', style: 'cancel' },
                {
                    text: 'Devolução Normal',
                    onPress: () => handleCancelWithReason(reservationId, 'RETURN'),
                },
                {
                    text: 'Devolução Danificada',
                    onPress: () => handleCancelWithReason(reservationId, 'DAMAGED_RETURN'),
                },
            ] : [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, Cancelar',
                    style: 'destructive',
                    onPress: () => handleCancelWithReason(reservationId, 'DESIST'),
                },
            ]
        );
    };

    const handleCancelWithReason = async (reservationId: number, reason: CancelReason) => {
        try {
            // Para RETURN, seria necessário pedir locationId, mas por simplicidade vamos omitir
            await cancelReservation(reservationId, { cancelReason: reason });
            Alert.alert('Sucesso', 'Reserva cancelada com sucesso');
            loadReservations();
        } catch (err) {
            const apiError = err as ApiError;
            Alert.alert('Erro', apiError.message);
        }
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
                    {/* WAREHOUSE pode atribuir reservas pendentes */}
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

                    {/* WAREHOUSE pode avançar status das suas reservas */}
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

                    {/* Botão de cancelar (disponível para vários roles) */}
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

            {/* Tabs de filtro */}
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
});

export default Orders;
