import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Header from '../../(shared)/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    recordEntry,
    recordExit,
    recordTransfer,
    recordReturn,
    recordAdjustment,
    getPartMovements,
    getAvailableLocations,
    StockMovement,
    AvailableLocation,
    MovementType,
    getMovementTypeName,
    getMovementTypeColor,
    formatTimestamp,
    ApiError,
} from '../../(services)/movementService';
import { getPartById, Part } from '../../(services)/partsService';

type MovementAction = 'ENTRY' | 'EXIT' | 'TRANSFER' | 'RETURN' | 'ADJUSTMENT';

const MovementPart = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    
    // Estado da peça
    const [part, setPart] = useState<Part | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estado dos movimentos
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    // Estado das localizações
    const [locations, setLocations] = useState<AvailableLocation[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Estado do formulário
    const [showForm, setShowForm] = useState(false);
    const [actionType, setActionType] = useState<MovementAction>('ENTRY');
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [fromLocationId, setFromLocationId] = useState<number | null>(null);
    const [toLocationId, setToLocationId] = useState<number | null>(null);
    const [isDamaged, setIsDamaged] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Carregar peça e dados iniciais
    useEffect(() => {
        loadPart();
    }, [id]);

    const loadPart = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Validar e converter o ID
            const partId = Array.isArray(id) ? id[0] : id;
            
            if (!partId) {
                setError('ID da peça não encontrado');
                setLoading(false);
                return;
            }

            console.log('📄 Carregando peça', partId);
            const partData = await getPartById(partId);
            setPart(partData);
            
            // Carregar movimentos e localizações em paralelo
            await Promise.all([
                loadMovements(partData.id),
                loadLocations(),
            ]);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const loadMovements = async (partId: number) => {
        try {
            setLoadingMovements(true);
            const movementsData = await getPartMovements(partId);
            setMovements(movementsData);
        } catch (err) {
            console.error('Erro ao carregar movimentos:', err);
        } finally {
            setLoadingMovements(false);
        }
    };

    const loadLocations = async () => {
        try {
            setLoadingLocations(true);
            const locationsData = await getAvailableLocations();
            setLocations(locationsData);
        } catch (err) {
            console.error('Erro ao carregar localizações:', err);
        } finally {
            setLoadingLocations(false);
        }
    };

    const handleOpenForm = (action: MovementAction) => {
        setActionType(action);
        setShowForm(true);
        resetForm();
        
        // Pré-selecionar localização atual para transferências
        if (action === 'TRANSFER' && part?.locationId) {
            setFromLocationId(part.locationId);
        }
    };

    const resetForm = () => {
        setSelectedLocationId(null);
        setFromLocationId(null);
        setToLocationId(null);
        setIsDamaged(false);
    };

    const handleSubmit = async () => {
        if (!part) return;

        try {
            setSubmitting(true);
            setError(null);

            switch (actionType) {
                case 'ENTRY':
                    if (!selectedLocationId) {
                        setError('Selecione uma localização');
                        return;
                    }
                    await recordEntry({
                        partId: part.id,
                        locationId: selectedLocationId,
                    });
                    break;

                case 'EXIT':
                    await recordExit({ partId: part.id });
                    break;

                case 'TRANSFER':
                    if (!fromLocationId || !toLocationId) {
                        setError('Selecione as localizações de origem e destino');
                        return;
                    }
                    if (fromLocationId === toLocationId) {
                        setError('As localizações de origem e destino devem ser diferentes');
                        return;
                    }
                    await recordTransfer({
                        partId: part.id,
                        fromLocationId,
                        toLocationId,
                    });
                    break;

                case 'RETURN':
                    if (!isDamaged && !toLocationId) {
                        setError('Selecione uma localização ou marque como danificada');
                        return;
                    }
                    await recordReturn({
                        partId: part.id,
                        toLocationId: isDamaged ? undefined : toLocationId!,
                        isDamaged,
                    });
                    break;

                case 'ADJUSTMENT':
                    await recordAdjustment({
                        partId: part.id,
                        newLocationId: selectedLocationId,
                    });
                    break;
            }

            setShowForm(false);
            loadPart(); // Recarregar dados
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => {
        const partId = Array.isArray(id) ? id[0] : id;
        router.push(`/Parts/${partId}`);
    };


    const handleLogoutPress = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            router.replace('/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Carregando...</Text>
            </View>
        );
    }

    if (error && !part) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.button} onPress={handleBack}>
                    <Text style={styles.buttonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!part) return null;

    return (
        <View style={styles.container}>
            <Header onProfilePress={() => router.push('/profile')} onLogoutPress={handleLogoutPress} />

            {/* Barra de navegação com botão voltar */}
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Informação da Peça */}
                <View style={styles.partInfo}>
                    <Text style={styles.partName}>{part.name}</Text>
                    <Text style={styles.partRef}>Ref: {part.refInternal}</Text>
                    {part.location && (
                        <Text style={styles.partLocation}>
                            📍 {part.location.fullCode}
                        </Text>
                    )}
                </View>

                {/* Botões de Ação */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Registar Movimento</Text>
                    
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                            onPress={() => handleOpenForm('ENTRY')}
                        >
                            <Text style={styles.actionButtonText}>📦 Entrada</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                            onPress={() => handleOpenForm('EXIT')}
                        >
                            <Text style={styles.actionButtonText}>📤 Saída</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                            onPress={() => handleOpenForm('TRANSFER')}
                        >
                            <Text style={styles.actionButtonText}>🔄 Transferir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                            onPress={() => handleOpenForm('RETURN')}
                        >
                            <Text style={styles.actionButtonText}>↩️ Devolução</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                            onPress={() => handleOpenForm('ADJUSTMENT')}
                        >
                            <Text style={styles.actionButtonText}>⚙️ Ajuste</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Histórico de Movimentos */}
                <View style={styles.historyContainer}>
                    <Text style={styles.sectionTitle}>Histórico</Text>
                    
                    {loadingMovements ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                    ) : movements.length === 0 ? (
                        <Text style={styles.emptyText}>Sem movimentos registados</Text>
                    ) : (
                        movements.map((movement) => (
                            <View key={movement.id} style={styles.movementCard}>
                                <View style={styles.movementHeader}>
                                    <View
                                        style={[
                                            styles.movementBadge,
                                            { backgroundColor: getMovementTypeColor(movement.type) },
                                        ]}
                                    >
                                        <Text style={styles.movementBadgeText}>
                                            {getMovementTypeName(movement.type)}
                                        </Text>
                                    </View>
                                    <Text style={styles.movementDate}>
                                        {formatTimestamp(movement.timestamp)}
                                    </Text>
                                </View>

                                {movement.sourceLoc && (
                                    <Text style={styles.movementDetail}>
                                        De: {movement.sourceLoc.fullCode} ({movement.sourceLoc.warehouse.name})
                                    </Text>
                                )}

                                {movement.destLoc && (
                                    <Text style={styles.movementDetail}>
                                        Para: {movement.destLoc.fullCode} ({movement.destLoc.warehouse.name})
                                    </Text>
                                )}

                                {movement.user && (
                                    <Text style={styles.movementUser}>
                                        Por: {movement.user.fullName || movement.user.username}
                                    </Text>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Modal de Formulário */}
            <Modal
                visible={showForm}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowForm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {getMovementTypeName(actionType)}
                        </Text>

                        {error && (
                            <Text style={styles.errorText}>{error}</Text>
                        )}

                        {/* Formulário baseado no tipo de ação */}
                        {actionType === 'ENTRY' && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Localização de Destino</Text>
                                <Picker
                                    selectedValue={selectedLocationId}
                                    onValueChange={(value) => setSelectedLocationId(value)}
                                    style={styles.picker}
                                >
                                    <Picker.Item key="entry-empty" label="Selecione..." value={null} />
                                    {locations.filter(loc => loc.hasSpace).map((loc) => (
                                        <Picker.Item
                                            key={`entry-loc-${loc.id}`}
                                            label={`${loc.fullCode} (${loc.availableSpace} livres)`}
                                            value={loc.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        {actionType === 'EXIT' && (
                            <Text style={styles.infoText}>
                                A peça será removida da localização atual.
                            </Text>
                        )}

                        {actionType === 'TRANSFER' && (
                            <>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>De (Origem)</Text>
                                    <Picker
                                        selectedValue={fromLocationId}
                                        onValueChange={(value) => setFromLocationId(value)}
                                        style={styles.picker}
                                    >
                                        <Picker.Item key="from-empty" label="Selecione..." value={null} />
                                        {locations.map((loc) => (
                                            <Picker.Item
                                                key={`from-loc-${loc.id}`}
                                                label={loc.fullCode}
                                                value={loc.id}
                                            />
                                        ))}
                                    </Picker>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Para (Destino)</Text>
                                    <Picker
                                        selectedValue={toLocationId}
                                        onValueChange={(value) => setToLocationId(value)}
                                        style={styles.picker}
                                    >
                                        <Picker.Item key="to-empty" label="Selecione..." value={null} />
                                        {locations.filter(loc => loc.hasSpace).map((loc) => (
                                            <Picker.Item
                                                key={`to-loc-${loc.id}`}
                                                label={`${loc.fullCode} (${loc.availableSpace} livres)`}
                                                value={loc.id}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </>
                        )}

                        {actionType === 'RETURN' && (
                            <>
                                <View style={styles.formGroup}>
                                    <TouchableOpacity
                                        style={styles.checkboxContainer}
                                        onPress={() => setIsDamaged(!isDamaged)}
                                    >
                                        <View style={[styles.checkbox, isDamaged && styles.checkboxChecked]}>
                                            {isDamaged && <Text style={styles.checkboxCheck}>✓</Text>}
                                        </View>
                                        <Text style={styles.checkboxLabel}>Peça danificada</Text>
                                    </TouchableOpacity>
                                </View>

                                {!isDamaged && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Localização de Retorno</Text>
                                        <Picker
                                            selectedValue={toLocationId}
                                            onValueChange={(value) => setToLocationId(value)}
                                            style={styles.picker}
                                        >
                                            <Picker.Item key="return-empty" label="Selecione..." value={null} />
                                            {locations.filter(loc => loc.hasSpace).map((loc) => (
                                                <Picker.Item
                                                    key={`return-loc-${loc.id}`}
                                                    label={`${loc.fullCode} (${loc.availableSpace} livres)`}
                                                    value={loc.id}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                )}
                            </>
                        )}

                        {actionType === 'ADJUSTMENT' && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Nova Localização</Text>
                                <Picker
                                    selectedValue={selectedLocationId}
                                    onValueChange={(value) => setSelectedLocationId(value)}
                                    style={styles.picker}
                                >
                                    <Picker.Item key="adjust-remove" label="Remover localização" value={null} />
                                    {locations.filter(loc => loc.hasSpace).map((loc) => (
                                        <Picker.Item
                                            key={`adjust-loc-${loc.id}`}
                                            label={`${loc.fullCode} (${loc.availableSpace} livres)`}
                                            value={loc.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        {/* Botões do Modal */}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowForm(false)}
                                disabled={submitting}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonText}>Confirmar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backText: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    partInfo: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    partName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    partRef: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    partLocation: {
        fontSize: 14,
        color: '#3b82f6',
        marginTop: 8,
        fontWeight: '500',
    },
    actionsContainer: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
        minWidth: '48%',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    historyContainer: {
        marginBottom: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 14,
        marginTop: 16,
    },
    movementCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    movementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    movementBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    movementBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    movementDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    movementDetail: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 4,
    },
    movementUser: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    picker: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginVertical: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    checkboxCheck: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#374151',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    submitButton: {
        backgroundColor: '#3b82f6',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
})

export default MovementPart;