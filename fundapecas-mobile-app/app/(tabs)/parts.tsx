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
import FilterPanel, { FilterState } from '../(shared)/FilterPanel';
import {
    searchParts,
    formatPrice,
    getConditionName,
    getCategories,
    Part,
    ApiError,
    SearchPartsResponse,
    Category,
} from '../(services)/partsService';
//import { getLocations, Location } from '';
import { getUserFavorites } from '../(services)/favoritesService';

const PADDING = 5;
const GAP = 16;
const COLUMNS = 4;
const ITEMS_PER_PAGE = 20;

const Parts = () => {
    const router = useRouter();
    const [searchData, setSearchData] = useState<SearchPartsResponse>({
        items: [],
        total: 0,
        page: 1,
        pageSize: ITEMS_PER_PAGE,
        totalPages: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
    const [filterPanelVisible, setFilterPanelVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    const screenWidth = Dimensions.get('window').width;
    const cardWidth = (screenWidth - (PADDING * 2) - (GAP * (COLUMNS - 1))) / COLUMNS;

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    useEffect(() => {
        loadParts(searchQuery, currentPage, activeFilters);
    }, [searchQuery, currentPage, activeFilters]);

    const loadInitialData = async () => {
        await Promise.all([
            loadParts(),
            loadFavorites(),
            loadCategories(),
            //loadLocations(),
        ]);
    };

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Erro ao carregar categorias:', err);
        }
    };

    /*const loadLocations = async () => {
        try {
            const data = await getLocations();
            setLocations(data);
        } catch (err) {
            console.error('Erro ao carregar localizações:', err);
        }
    };*/

    const loadParts = async (
        query: string = '',
        page: number = 1,
        filters: FilterState = activeFilters
    ) => {
        try {
            setLoading(true);
            setError(null);

            const data = await searchParts({
                text: query || undefined,
                page,
                pageSize: ITEMS_PER_PAGE,
                ...filters,
            });

            setSearchData(data);
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
        await Promise.all([
            loadParts(searchQuery, currentPage, activeFilters),
            loadFavorites(),
        ]);
        setRefreshing(false);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        setCurrentPage(1);
    };

    const handleChangeText = (text: string) => {
        setSearchQuery(text);
    };

    const goToPage = (page: number) => {
        setCurrentPage(page);
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

    const handleApplyFilters = (filters: FilterState) => {
        setActiveFilters(filters);
        setCurrentPage(1);
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
        const parts = searchData.items;
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
        if (searchData.totalPages <= 1) return null;

        const { page: currentPageNum, totalPages } = searchData;
        const pages: number[] = [];

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (currentPageNum > 3) pages.push(-1);
            for (let i = Math.max(2, currentPageNum - 1); i <= Math.min(totalPages - 1, currentPageNum + 1); i++) {
                pages.push(i);
            }
            if (currentPageNum < totalPages - 2) pages.push(-2);
            pages.push(totalPages);
        }

        return (
            <View style={styles.pagination}>
                <TouchableOpacity
                    style={[styles.pageButton, currentPageNum === 1 && styles.pageButtonDisabled]}
                    onPress={() => currentPageNum > 1 && goToPage(currentPageNum - 1)}
                    disabled={currentPageNum === 1}
                >
                    <Ionicons name="chevron-back" size={20} color={currentPageNum === 1 ? '#9ca3af' : '#3b82f6'} />
                </TouchableOpacity>

                {pages.map((page, index) => {
                    if (page < 0) {
                        return <Text key={`ellipsis-${index}`} style={styles.ellipsis}>...</Text>;
                    }
                    return (
                        <TouchableOpacity
                            key={page}
                            style={[styles.pageButton, page === currentPageNum && styles.pageButtonActive]}
                            onPress={() => goToPage(page)}
                        >
                            <Text style={[styles.pageText, page === currentPageNum && styles.pageTextActive]}>
                                {page}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                <TouchableOpacity
                    style={[styles.pageButton, currentPageNum === totalPages && styles.pageButtonDisabled]}
                    onPress={() => currentPageNum < totalPages && goToPage(currentPageNum + 1)}
                    disabled={currentPageNum === totalPages}
                >
                    <Ionicons name="chevron-forward" size={20} color={currentPageNum === totalPages ? '#9ca3af' : '#3b82f6'} />
                </TouchableOpacity>
            </View>
        );
    };

    if (loading && !refreshing) {
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
                <TouchableOpacity style={styles.retryButton} onPress={() => loadParts()}>
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
                <View style={styles.statsLeft}>
                    <Text style={styles.statsText}>
                        {searchData.total} {searchData.total === 1 ? 'peça encontrada' : 'peças encontradas'}
                    </Text>
                    {searchData.totalPages > 1 && (
                        <Text style={styles.statsText}>
                            Página {searchData.page} de {searchData.totalPages}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFilterPanelVisible(true)}
                >
                    <Ionicons name="filter" size={20} color="#3b82f6" />
                    <Text style={styles.filterButtonText}>Filtros</Text>
                </TouchableOpacity>
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
                {searchData.items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={64} color="#9ca3af" />
                        <Text style={styles.emptyText}>
                            Nenhuma peça encontrada
                        </Text>
                    </View>
                ) : (
                    <>
                        {renderPartsGrid()}
                        {renderPagination()}
                    </>
                )}
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={handleCreatePart}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            <FilterPanel
                visible={filterPanelVisible}
                onClose={() => setFilterPanelVisible(false)}
                onApply={handleApplyFilters}
                categories={categories}
                locations={locations}
            />
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
    statsLeft: {
        flex: 1,
    },
    statsText: {
        fontSize: 14,
        color: '#6b7280',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3b82f6',
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
});

export default Parts;