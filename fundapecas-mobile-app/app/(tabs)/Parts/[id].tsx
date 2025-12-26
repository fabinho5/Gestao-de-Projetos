import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Header from '../../(shared)/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getPartById,
    formatPrice,
    getConditionName,
    Part,
    ApiError,
} from '../../(services)/partsService';

const PartDetails = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [part, setPart] = useState<Part | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    useEffect(() => {
        loadPartDetails();
    }, [id]);

    const loadPartDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const partData = await getPartById(id as string);
            setPart(partData);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message);
            Alert.alert('Erro', apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.replace('/parts');
    };

    const handleEdit = () => {
        router.push(`/Parts/editPart?id=${id}`);
    };

    const handleDelete = async () => {
        // Mostrar confirmação antes de eliminar
        Alert.alert(
            'Confirmar Eliminação',
            'Tem certeza que deseja eliminar esta peça? Esta ação não pode ser desfeita.',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // TODO: Chamar API para eliminar a peça
                            // await deletePart(id as string);
                            
                            // TODO: Mostrar mensagem de sucesso
                            // Alert.alert('Sucesso', 'Peça eliminada com sucesso');
                            
                            // TODO: Redirecionar para a lista de peças
                            // router.replace('/parts');
                        } catch (err) {
                            // TODO: Tratar erro
                            // const apiError = err as ApiError;
                            // Alert.alert('Erro', apiError.message);
                        }
                    },
                },
            ]
        );
    };

    const handleLogoutPress = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            router.replace('/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            Alert.alert('Erro', 'Não foi possível fazer logout');
        }
    };

    const handleMovement = () => {
        router.push(`/Parts/movementPart?id=${id}`);
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
            
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleMovement} style={styles.actionButton}>
                        <Ionicons name="swap-horizontal" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Movimento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleEdit} style={styles.actionButtonPrimary}>
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.actionButtonDelete}>
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
    actionButtonDelete: {
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