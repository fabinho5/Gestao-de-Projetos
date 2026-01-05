import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    Modal,
    TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Header from '../../(shared)/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getPartById,
    deletePart,
    formatPrice,
    getConditionName,
    Part,
    ApiError,
} from '../../(services)/partsService';
import {
    checkFavorite,
    addFavorite,
    removeFavorite,
} from '../../(services)/favoritesService';
import {
    createReservation,
    CreateReservationData,
} from '../../(services)/reservationsService';

const PartDetails = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [part, setPart] = useState<Part | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');
    const [orderLoading, setOrderLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [errorMessageText, setErrorMessageText] = useState('');
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        loadPartDetails();
    }, [id]);

    useEffect(() => {
        if (part?.id) {
            loadFavoriteStatus();
        }
    }, [part]);

    const loadPartDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const partId = Array.isArray(id) ? id[0] : id;
            
            if (!partId) {
                setError('ID da peça não encontrado');
                setLoading(false);
                return;
            }
            
            const partData = await getPartById(partId);
            setPart(partData);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const loadFavoriteStatus = async () => {
        try {
            if (!part?.id) return;
            const status = await checkFavorite(part.id);
            setIsFavorite(status);
        } catch (err) {
            console.error('Erro ao verificar favorito:', err);
        }
    };

    const showMessage = (message: string, isSuccess: boolean) => {
        if (isSuccess) {
            setSuccessMessage(message);
            setShowSuccessMessage(true);
        } else {
            setErrorMessageText(message);
            setShowErrorMessage(true);
        }

        fadeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(2500),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (isSuccess) {
                setShowSuccessMessage(false);
            } else {
                setShowErrorMessage(false);
            }
        });
    };

    const handleToggleFavorite = async () => {
        if (!part) return;

        try {
            setFavoriteLoading(true);
            
            if (isFavorite) {
                await removeFavorite(part.id);
                setIsFavorite(false);
                showMessage('Removido dos favoritos', true);
            } else {
                await addFavorite(part.id);
                setIsFavorite(true);
                showMessage('Adicionado aos favoritos', true);
            }
        } catch (err) {
            const apiError = err as ApiError;
            showMessage(apiError.message, false);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const handleOpenOrderModal = () => {
        setOrderModalVisible(true);
        setOrderNotes('');
    };

    const handleCreateOrder = async () => {
        if (!part) return;

        try {
            setOrderLoading(true);

            const data: CreateReservationData = {
                partId: part.id,
                notes: orderNotes.trim() || undefined,
            };

            await createReservation(data);
            showMessage('Pedido criado com sucesso!', true);
            setOrderModalVisible(false);
            setOrderNotes('');
        } catch (err) {
            const apiError = err as ApiError;
            showMessage(apiError.message || 'Já existe um pedido em aberto para esta peça.', false);
        } finally {
            setOrderLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!part) return;

        setDeleteModalVisible(false);

        try {
            setDeleteLoading(true);
            await deletePart(part.refInternal);
            showMessage('Peça eliminada com sucesso', true);
            setTimeout(() => {
                router.replace('/parts');
            }, 1500);
        } catch (err) {
            const apiError = err as ApiError;
            showMessage(apiError.message, false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleBack = () => {
        router.replace('/parts');
    };

    const handleEdit = () => {
        const partId = Array.isArray(id) ? id[0] : id;
        router.push(`/Parts/editPart?id=${partId}`);
    };

    const handleLogoutPress = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            router.replace('/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    const handleMovement = () => {
        const partId = Array.isArray(id) ? id[0] : id;
        router.push(`/Parts/movementPart?id=${partId}`);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Carregando detalhes...</Text>
            </View>
        );
    }

    if (error || !part) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>{error || 'Peça não encontrada'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadPartDetails}>
                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header onProfilePress={() => router.push('/profile')} onLogoutPress={handleLogoutPress} />
            
            {/* Mensagens de Sucesso/Erro */}
            {showSuccessMessage && (
                <Animated.View style={[styles.messageContainer, styles.successMessage, { opacity: fadeAnim }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.successMessageText}>{successMessage}</Text>
                </Animated.View>
            )}

            {showErrorMessage && (
                <Animated.View style={[styles.messageContainer, styles.errorMessage, { opacity: fadeAnim }]}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.errorMessageText}>{errorMessageText}</Text>
                </Animated.View>
            )}

            {/* Modal de Criação de Pedido */}
            <Modal
                transparent
                visible={orderModalVisible}
                animationType="fade"
                onRequestClose={() => setOrderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="basket" size={48} color="#3b82f6" />
                        <Text style={styles.modalTitle}>Criar Pedido</Text>
                        <Text style={styles.modalText}>
                            Deseja criar um pedido para "{part.name}"?
                        </Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Notas (opcional)</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Adicione observações sobre o pedido..."
                                placeholderTextColor="#9ca3af"
                                value={orderNotes}
                                onChangeText={setOrderNotes}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setOrderModalVisible(false)}
                                disabled={orderLoading}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonConfirm}
                                onPress={handleCreateOrder}
                                disabled={orderLoading}
                            >
                                {orderLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonConfirmText}>Criar Pedido</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Confirmação de Eliminação */}
            <Modal
                transparent
                visible={deleteModalVisible}
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="warning" size={48} color="#ef4444" />
                        <Text style={styles.modalTitle}>Eliminar Peça?</Text>
                        <Text style={styles.modalText}>
                            Tem certeza que deseja eliminar a peça "{part.name}"?
                        </Text>
                        <Text style={styles.modalWarning}>
                            Esta ação não pode ser desfeita!
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setDeleteModalVisible(false)}
                                disabled={deleteLoading}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonDelete}
                                onPress={handleDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonDeleteText}>Eliminar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.headerBar}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                
                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        onPress={handleToggleFavorite} 
                        style={[
                            styles.favoriteButton,
                            isFavorite && styles.favoriteButtonActive
                        ]}
                        disabled={favoriteLoading}
                    >
                        {favoriteLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons 
                                    name={isFavorite ? "heart" : "heart-outline"} 
                                    size={20} 
                                    color="#fff" 
                                />
                                <Text style={styles.actionButtonText}>
                                    {isFavorite ? 'Remover' : 'Favorito'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={handleOpenOrderModal} 
                        style={styles.orderButton}
                    >
                        <Ionicons name="basket" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Fazer Pedido</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleMovement} style={styles.actionButton}>
                        <Ionicons name="swap-horizontal" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Movimento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleEdit} style={styles.actionButtonPrimary}>
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setDeleteModalVisible(true)} 
                        style={styles.actionButtonDanger}
                    >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    {/* Galeria de Imagens */}
                    <View style={styles.imageSection}>
                        <View style={styles.mainImageContainer}>
                            {part.images && part.images.length > 0 ? (
                                <Image
                                    source={{ uri: part.images[selectedImageIndex].url }}
                                    style={styles.mainImage}
                                    contentFit="contain"
                                />
                            ) : (
                                <View style={styles.placeholderImage}>
                                    <Ionicons name="image-outline" size={80} color="#9ca3af" />
                                </View>
                            )}
                            
                            <View style={styles.conditionBadge}>
                                <Text style={styles.conditionText}>
                                    {getConditionName(part.condition)}
                                </Text>
                            </View>

                            {isFavorite && (
                                <View style={styles.favoriteBadge}>
                                    <Ionicons name="heart" size={16} color="#fff" />
                                </View>
                            )}
                        </View>

                        {part.images && part.images.length > 1 && (
                            <View style={styles.thumbnailContainer}>
                                {part.images.map((image, index) => (
                                    <TouchableOpacity
                                        key={image.id}
                                        onPress={() => setSelectedImageIndex(index)}
                                        style={[
                                            styles.thumbnail,
                                            selectedImageIndex === index && styles.thumbnailActive
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: image.url }}
                                            style={styles.thumbnailImage}
                                            contentFit="cover"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Informações Principais */}
                    <View style={styles.infoSection}>
                        <Text style={styles.partName}>{part.name}</Text>
                        <Text style={styles.partPrice}>{formatPrice(part.price)}</Text>
                        
                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Referência Interna:</Text>
                            <Text style={styles.infoValue}>{part.refInternal}</Text>
                        </View>

                        {part.refOEM && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Referência OEM:</Text>
                                <Text style={styles.infoValue}>{part.refOEM}</Text>
                            </View>
                        )}

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Categoria:</Text>
                            <Text style={styles.infoValue}>{part.category.name}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Localização:</Text>
                            <Text style={styles.infoValue}>{part.location.fullCode}</Text>
                        </View>

                        {part.description && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Descrição</Text>
                                <Text style={styles.description}>{part.description}</Text>
                            </>
                        )}

                        {part.specifications && part.specifications.length > 0 && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Especificações</Text>
                                {part.specifications.map((spec) => (
                                    <View key={spec.id} style={styles.specRow}>
                                        <Text style={styles.specLabel}>{spec.spec.name}:</Text>
                                        <Text style={styles.specValue}>{spec.value}</Text>
                                    </View>
                                ))}
                            </>
                        )}

                        {part.subReferences && part.subReferences.length > 0 && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Sub-Referências</Text>
                                <View style={styles.subRefsContainer}>
                                    {part.subReferences.map((subRef) => (
                                        <View key={subRef.id} style={styles.subRefChip}>
                                            <Text style={styles.subRefText}>{subRef.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                </View>
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
    messageContainer: {
        position: 'absolute',
        top: 80,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    successMessage: {
        backgroundColor: '#d1fae5',
        borderWidth: 1,
        borderColor: '#10b981',
    },
    errorMessage: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    successMessageText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#065f46',
        fontWeight: '600',
        flex: 1,
    },
    errorMessageText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#991b1b',
        fontWeight: '600',
        flex: 1,
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
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginTop: 16,
        marginBottom: 8,
    },
    modalText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    modalWarning: {
        fontSize: 12,
        color: '#ef4444',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 24,
    },
    formGroup: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    textArea: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButtonCancel: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    modalButtonConfirm: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonConfirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    modalButtonDelete: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonDeleteText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
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
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    favoriteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#9ca3af',
        borderRadius: 8,
    },
    favoriteButtonActive: {
        backgroundColor: '#eab308',
    },
    orderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#10b981',
        borderRadius: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#6b7280',
        borderRadius: 8,
    },
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    actionButtonDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#ef4444',
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    imageSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    mainImageContainer: {
        width: '100%',
        height: 400,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    conditionBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    conditionText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    favoriteBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(234, 179, 8, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbnailContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    thumbnailActive: {
        borderColor: '#3b82f6',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    infoSection: {
        padding: 20,
    },
    partName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    partPrice: {
        fontSize: 28,
        fontWeight: '700',
        color: '#3b82f6',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    specLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    specValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    subRefsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    subRefChip: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    subRefText: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '500',
    },
});

export default PartDetails;