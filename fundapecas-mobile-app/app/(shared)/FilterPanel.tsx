import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PartCondition } from '../(services)/partsService';

interface FilterPanelProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    categories: Array<{ id: number; name: string }>;
    locations: Array<{ id: number; fullCode: string }>;
}

export interface FilterState {
    categoryId?: number;
    condition?: PartCondition;
    priceMin?: number;
    priceMax?: number;
    locationId?: number;
    isVisible?: boolean;
    sortBy: 'name' | 'price' | 'createdAt' | 'updatedAt' | 'refInternal';
    sortOrder: 'asc' | 'desc';
}

const PANEL_WIDTH = Dimensions.get('window').width * 0.5;

const FilterPanel: React.FC<FilterPanelProps> = ({
    visible,
    onClose,
    onApply,
    categories,
    locations,
}) => {
    const [slideAnim] = useState(new Animated.Value(-PANEL_WIDTH));
    const [filters, setFilters] = useState<FilterState>({
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visible ? 0 : -PANEL_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        setFilters({
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });
    };

    const conditions: Array<{ value: PartCondition; label: string }> = [
        { value: 'NEW', label: 'Nova' },
        { value: 'USED', label: 'Usada' },
        { value: 'REFURBISHED', label: 'Recondicionada' },
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Data de Criação' },
        { value: 'updatedAt', label: 'Última Atualização' },
        { value: 'name', label: 'Nome' },
        { value: 'price', label: 'Preço' },
        { value: 'refInternal', label: 'Referência' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <Animated.View
                    style={[
                        styles.panel,
                        {
                            transform: [{ translateX: slideAnim }],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Filtros</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Categoria */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Categoria</Text>
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        !filters.categoryId && styles.optionActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, categoryId: undefined })}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            !filters.categoryId && styles.optionTextActive,
                                        ]}
                                    >
                                        Todas
                                    </Text>
                                </TouchableOpacity>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.option,
                                            filters.categoryId === cat.id && styles.optionActive,
                                        ]}
                                        onPress={() =>
                                            setFilters({ ...filters, categoryId: cat.id })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                filters.categoryId === cat.id &&
                                                    styles.optionTextActive,
                                            ]}
                                        >
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Condição */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Condição</Text>
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        !filters.condition && styles.optionActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, condition: undefined })}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            !filters.condition && styles.optionTextActive,
                                        ]}
                                    >
                                        Todas
                                    </Text>
                                </TouchableOpacity>
                                {conditions.map((cond) => (
                                    <TouchableOpacity
                                        key={cond.value}
                                        style={[
                                            styles.option,
                                            filters.condition === cond.value && styles.optionActive,
                                        ]}
                                        onPress={() =>
                                            setFilters({ ...filters, condition: cond.value })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                filters.condition === cond.value &&
                                                    styles.optionTextActive,
                                            ]}
                                        >
                                            {cond.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Preço */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Faixa de Preço (€)</Text>
                            <View style={styles.priceInputs}>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Mínimo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={filters.priceMin?.toString() || ''}
                                        onChangeText={(text) => {
                                            const value = text ? parseFloat(text) : undefined;
                                            setFilters({ ...filters, priceMin: value });
                                        }}
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Máximo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="∞"
                                        keyboardType="numeric"
                                        value={filters.priceMax?.toString() || ''}
                                        onChangeText={(text) => {
                                            const value = text ? parseFloat(text) : undefined;
                                            setFilters({ ...filters, priceMax: value });
                                        }}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Localização */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Localização</Text>
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        !filters.locationId && styles.optionActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, locationId: undefined })}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            !filters.locationId && styles.optionTextActive,
                                        ]}
                                    >
                                        Todas
                                    </Text>
                                </TouchableOpacity>
                                {locations.slice(0, 10).map((loc) => (
                                    <TouchableOpacity
                                        key={loc.id}
                                        style={[
                                            styles.option,
                                            filters.locationId === loc.id && styles.optionActive,
                                        ]}
                                        onPress={() =>
                                            setFilters({ ...filters, locationId: loc.id })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                filters.locationId === loc.id &&
                                                    styles.optionTextActive,
                                            ]}
                                        >
                                            {loc.fullCode}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Visibilidade */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Visibilidade</Text>
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        filters.isVisible === undefined && styles.optionActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, isVisible: undefined })}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            filters.isVisible === undefined &&
                                                styles.optionTextActive,
                                        ]}
                                    >
                                        Todas
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        filters.isVisible === true && styles.optionActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, isVisible: true })}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            filters.isVisible === true && styles.optionTextActive,
                                        ]}
                                    >
                                        Visíveis
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        filters.isVisible === false && styles.optionActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, isVisible: false })}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            filters.isVisible === false && styles.optionTextActive,
                                        ]}
                                    >
                                        Ocultas
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Ordenação */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Ordenar por</Text>
                            <View style={styles.optionsContainer}>
                                {sortOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.option,
                                            filters.sortBy === option.value && styles.optionActive,
                                        ]}
                                        onPress={() =>
                                            setFilters({
                                                ...filters,
                                                sortBy: option.value as any,
                                            })
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                filters.sortBy === option.value &&
                                                    styles.optionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.sortOrderContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.sortOrderButton,
                                        filters.sortOrder === 'asc' && styles.sortOrderButtonActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, sortOrder: 'asc' })}
                                >
                                    <Ionicons
                                        name="arrow-up"
                                        size={16}
                                        color={filters.sortOrder === 'asc' ? '#fff' : '#6b7280'}
                                    />
                                    <Text
                                        style={[
                                            styles.sortOrderText,
                                            filters.sortOrder === 'asc' &&
                                                styles.sortOrderTextActive,
                                        ]}
                                    >
                                        Crescente
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.sortOrderButton,
                                        filters.sortOrder === 'desc' &&
                                            styles.sortOrderButtonActive,
                                    ]}
                                    onPress={() => setFilters({ ...filters, sortOrder: 'desc' })}
                                >
                                    <Ionicons
                                        name="arrow-down"
                                        size={16}
                                        color={filters.sortOrder === 'desc' ? '#fff' : '#6b7280'}
                                    />
                                    <Text
                                        style={[
                                            styles.sortOrderText,
                                            filters.sortOrder === 'desc' &&
                                                styles.sortOrderTextActive,
                                        ]}
                                    >
                                        Decrescente
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleReset}
                        >
                            <Text style={styles.resetButtonText}>Limpar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={handleApply}
                        >
                            <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    panel: {
        width: PANEL_WIDTH,
        backgroundColor: '#fff',
        height: '100%',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 2, height: 0 },
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    option: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    optionActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    optionText: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    optionTextActive: {
        color: '#fff',
    },
    priceInputs: {
        flexDirection: 'row',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#fff',
    },
    sortOrderContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    sortOrderButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sortOrderButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    sortOrderText: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    sortOrderTextActive: {
        color: '#fff',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    resetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    applyButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});

export default FilterPanel;