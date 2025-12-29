import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../(shared)/Header';
import SearchBar from '../(shared)/SearchBar';
import {
    getAllParts,
    paginateParts,
    formatPrice,
    getConditionName,
    Part,
    PaginatedParts,
    ApiError,
} from '../(services)/partsService';
import { getUserFavorites } from '../(services)/favoritesService';

const PADDING = 5;
const GAP = 16;
const COLUMNS = 4;

const Parts = () => {
    const router = useRouter();
    const [allParts, setAllParts] = useState<Part[]>([]);
    const [paginatedData, setPaginatedData] = useState<PaginatedParts>({
        parts: [],
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

    // Calcular largura do card
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = (screenWidth - (PADDING * 2) - (GAP * (COLUMNS - 1))) / (COLUMNS * 1.025);

    // Carregar peças ao montar o componente e quando a tela receber foco
    useFocusEffect(
        useCallback(() => {
            loadParts();
            loadFavorites();
        }, [])
    );

    // Atualizar paginação quando a pesquisa ou página mudar
    useEffect(() => {
        if (allParts.length > 0) {
            updatePagination(searchQuery, paginatedData.currentPage);
        }
    }, [searchQuery, allParts]);

    const loadParts = async () => {
        try {
            setLoading(true);
            setError(null);
            const parts = await getAllParts();
            setAllParts(parts);
            updatePagination('', 1, parts);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const loadFavorites = async () => {
        try {
            const favorites = await getUserFavorites();
            const ids = new Set(favorites.map((fav: any) => fav.id));
            setFavoriteIds(ids);
        } catch (err) {
            console.error('Erro ao carregar favoritos:', err);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadParts();
        await loadFavorites();
        setRefreshing(false);
    };

    const updatePagination = (query: string, page: number, parts: Part[] = allParts) => {
        const paginated = paginateParts(parts, query, page, 20);
        setPaginatedData(paginated);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        updatePagination(text, 1);
    };

    const handleChangeText = (text: string) => {
        setSearchQuery(text);
    };

    const goToPage = (page: number) => {
        updatePagination(searchQuery, page);
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

    const handlePartPress = (refInternal: string) => {
        router.push(`/Parts/${refInternal}`);
    };

    const handleCreatePart = () => {
        router.push('/Parts/createPart');
    };

    const renderPartCard = (part: Part, idx: number, isLastInRow: boolean) => {
        const isFav = favoriteIds.has(part.id);
        
        return (
            <TouchableOpacity
                key={part.id}
                style={[styles.card, { width: cardWidth, marginRight: isLastInRow ? 0 : GAP }]}
                activeOpacity={0.7}
                onPress={() => handlePartPress(part.refInternal)}
            >
                <View style={styles.imageContainer}>
                    {part.images && part.images.length > 0 ? (
                        <Image
                            source={{ uri: part.images[0].url }}
                            style={styles.partImage}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="image-outline" size={40} color="#9ca3af" />
                        </View>
                    )}
                    
                    <View style={styles.conditionBadge}>
                        <Text style={styles.conditionText}>
                            {getConditionName(part.condition)}
                        </Text>
                    </View>

                    {/* Indicador de Favorito */}
                    {isFav && (
                        <View style={styles.favoriteIndicator}>
                            <Ionicons name="heart" size={14} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.partName} numberOfLines={2}>{part.name}</Text>
                    
                    <Text style={styles.partRef} numberOfLines={1}>
                        Ref: {part.refInternal}
                    </Text>

                    <View style={styles.categoryRow}>
                        <Ionicons name="pricetag-outline" size={12} color="#9ca3af" />
                        <Text style={styles.categoryText} numberOfLines={1}>
                            {part.category.name}
                        </Text>
                    </View>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color="#9ca3af" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {part.location.fullCode}
                        </Text>
                    </View>

                    <Text style={styles.partPrice}>{formatPrice(part.price)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderPartsGrid = () => {
        const parts = paginatedData.parts;
        const rows = [];
        
        for (let i = 0; i < parts.length; i += COLUMNS) {
            const rowParts = parts.slice(i, i + COLUMNS);
            rows.push(
                <View key={`row-${i}`} style={styles.row}>
                    {rowParts.map((part, idx) => renderPartCard(part, idx, idx === rowParts.length - 1))}
                    {rowParts.length < COLUMNS && Array.from({ length: COLUMNS - rowParts.length }).map((_, idxEmpty) => (
                        <View
                            key={`empty-${i}-${idxEmpty}`}
                            style={[styles.emptyCard, { width: cardWidth, marginRight: (idxEmpty === COLUMNS - rowParts.length - 1) ? 0 : GAP }]}
                        />
                    ))}
                </View>
            );
        }
        
        return <>{rows}</>;
    };

    const renderPagination = () => {
        if (paginatedData.totalPages <= 1) return null;

        const { currentPage, totalPages } = paginatedData;
        const pages: number[] = [];

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push(-2);
            pages.push(totalPages);
        }

        return (
            <View style={styles.pagination}>
                <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => currentPage > 1 && goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#9ca3af' : '#3b82f6'} />
                </TouchableOpacity>

                {pages.map((page, index) => {
                    if (page < 0) {
                        return <Text key={`ellipsis-${index}`} style={styles.ellipsis}>...</Text>;
                    }
                    return (
                        <TouchableOpacity
                            key={page}
                            style={[styles.pageButton, page === currentPage && styles.pageButtonActive]}
                            onPress={() => goToPage(page)}
                        >
                            <Text style={[styles.pageText, page === currentPage && styles.pageTextActive]}>
                                {page}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => currentPage < totalPages && goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#9ca3af' : '#3b82f6'} />
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Carregando peças...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadParts}>
                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header onProfilePress={handleProfilePress} onLogoutPress={handleLogoutPress} />
            
            <SearchBar
                placeholder="Pesquisar peças..."
                onSearch={handleSearch}
                onChangeText={handleChangeText}
            />

            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    {paginatedData.totalItems} {paginatedData.totalItems === 1 ? 'peça encontrada' : 'peças encontradas'}
                </Text>
                <TouchableOpacity style={styles.createButton} onPress={handleCreatePart}>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.createButtonText}>Nova Peça</Text>
                </TouchableOpacity>
                {paginatedData.totalPages > 1 && (
                    <Text style={styles.statsText}>
                        Página {paginatedData.currentPage} de {paginatedData.totalPages}
                    </Text>
                )}
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
                {paginatedData.parts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={64} color="#9ca3af" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Nenhuma peça encontrada' : 'Nenhuma peça disponível'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity style={styles.emptyButton} onPress={handleCreatePart}>
                                <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                                <Text style={styles.emptyButtonText}>Criar primeira peça</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        {renderPartsGrid()}
                        {renderPagination()}
                    </>
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
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 16,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
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
    emptyCard: {
        backgroundColor: 'transparent',
        borderRadius: 12,
    },
    imageContainer: {
        width: '100%',
        height: 150,
        backgroundColor: '#f3f4f6',
        position: 'relative',
    },
    partImage: {
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
        top: 8,
        right: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    conditionText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    favoriteIndicator: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(234, 179, 8, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    cardBody: {
        padding: 12,
    },
    partName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
        height: 36,
    },
    partRef: {
        fontSize: 11,
        color: '#6b7280',
        marginBottom: 6,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 11,
        color: '#9ca3af',
        flex: 1,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 11,
        color: '#9ca3af',
        flex: 1,
    },
    partPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3b82f6',
        marginTop: 4,
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
        marginBottom: 16,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    emptyButtonText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    pageButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    pageButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    pageText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    pageTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    ellipsis: {
        fontSize: 16,
        color: '#9ca3af',
        paddingHorizontal: 4,
    },
});

export default Parts;