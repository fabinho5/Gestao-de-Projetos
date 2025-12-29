import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Header from '../../(shared)/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createPart,
    getCategories,
    getLocations,
    getSpecifications,
    Category,
    Location,
    Specification,
    PartCondition,
    ApiError,
} from '../../(services)/partsService';

interface SpecificationValue {
    specId: number;
    value: string;
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
    onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, type, onClose }) => {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.alertOverlay}>
                <View style={styles.alertContainer}>
                    <View style={[styles.alertIcon, type === 'error' ? styles.alertIconError : styles.alertIconSuccess]}>
                        <Ionicons 
                            name={type === 'error' ? 'close-circle' : 'checkmark-circle'} 
                            size={48} 
                            color={type === 'error' ? '#ef4444' : '#10b981'} 
                        />
                    </View>
                    <Text style={styles.alertTitle}>{title}</Text>
                    <Text style={styles.alertMessage}>{message}</Text>
                    <TouchableOpacity style={styles.alertButton} onPress={onClose}>
                        <Text style={styles.alertButtonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const CreatePart = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    
    // Alert state
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'success' }>({
        visible: false,
        title: '',
        message: '',
        type: 'error',
    });

    // Form data
    const [name, setName] = useState('');
    const [refInternal, setRefInternal] = useState('');
    const [refOEM, setRefOEM] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [condition, setCondition] = useState<PartCondition>('NEW');
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [locationId, setLocationId] = useState<number | undefined>(undefined);
    const [specifications, setSpecifications] = useState<SpecificationValue[]>([]);
    const [subReferences, setSubReferences] = useState<string[]>(['']);

    // Data lists
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [availableSpecs, setAvailableSpecs] = useState<Specification[]>([]);

    useEffect(() => {
        loadFormData();
    }, []);

    const loadFormData = async () => {
        try {
            setLoadingData(true);
            
            // Carregar dados individualmente para melhor controle de erros
            let categoriesData: Category[] = [];
            let locationsData: Location[] = [];
            let specsData: Specification[] = [];

            try {
                categoriesData = await getCategories();
                console.log('✅ Categorias carregadas:', categoriesData);
                console.log('📊 Número de categorias:', categoriesData.length);
                if (categoriesData.length > 0) {
                    console.log('📋 Primeira categoria:', categoriesData[0]);
                }
            } catch (error) {
                console.error('❌ Erro ao carregar categorias:', error);
                showAlert('Erro', 'Não foi possível carregar as categorias', 'error');
            }

            try {
                locationsData = await getLocations();
                console.log('✅ Localizações carregadas:', locationsData);
                console.log('📊 Número de localizações:', locationsData.length);
            } catch (error) {
                console.error('❌ Erro ao carregar localizações:', error);
                showAlert('Aviso', 'Não foi possível carregar as localizações. Adicione o endpoint no backend.', 'error');
            }

            try {
                specsData = await getSpecifications();
                console.log('✅ Especificações carregadas:', specsData);
                console.log('📊 Número de especificações:', specsData.length);
            } catch (error) {
                console.error('❌ Erro ao carregar especificações:', error);
            }

            console.log('🔄 Atualizando states...');
            setCategories(categoriesData);
            setLocations(locationsData);
            setAvailableSpecs(specsData);
            
            console.log('📦 States atualizados');
            console.log('   - Categorias:', categoriesData.length);
            console.log('   - Localizações:', locationsData.length);
            console.log('   - Especificações:', specsData.length);
            
            // Set default values
            if (categoriesData.length > 0) {
                console.log('🎯 Definindo categoria padrão:', categoriesData[0].id);
                setCategoryId(categoriesData[0].id);
            } else {
                console.warn('⚠️ Nenhuma categoria disponível para definir como padrão');
            }
            
            if (locationsData.length > 0) {
                console.log('🎯 Definindo localização padrão:', locationsData[0].id);
                setLocationId(locationsData[0].id);
            } else {
                console.warn('⚠️ Nenhuma localização disponível para definir como padrão');
            }
        } catch (err) {
            const apiError = err as ApiError;
            showAlert('Erro', apiError.message, 'error');
        } finally {
            setLoadingData(false);
            console.log('✨ Carregamento concluído');
        }
    };

    const showAlert = (title: string, message: string, type: 'error' | 'success') => {
        setAlert({ visible: true, title, message, type });
    };

    const closeAlert = () => {
        if (alert.type === 'success') {
            router.back();
        }
        setAlert({ ...alert, visible: false });
    };

    const handleBack = () => {
        router.replace('/parts');
    };

    const addSpecification = () => {
        if (availableSpecs.length === 0) {
            showAlert('Aviso', 'Não há especificações disponíveis', 'error');
            return;
        }
        setSpecifications([...specifications, { specId: availableSpecs[0].id, value: '' }]);
    };

    const removeSpecification = (index: number) => {
        setSpecifications(specifications.filter((_, i) => i !== index));
    };

    const updateSpecification = (index: number, field: 'specId' | 'value', value: number | string) => {
        const updated = [...specifications];
        updated[index] = { ...updated[index], [field]: value };
        setSpecifications(updated);
    };

    const addSubReference = () => {
        setSubReferences([...subReferences, '']);
    };

    const removeSubReference = (index: number) => {
        setSubReferences(subReferences.filter((_, i) => i !== index));
    };

    const updateSubReference = (index: number, value: string) => {
        const updated = [...subReferences];
        updated[index] = value;
        setSubReferences(updated);
    };

    const validateForm = (): boolean => {
        if (!name.trim()) {
            showAlert('Erro', 'Nome é obrigatório', 'error');
            return false;
        }
        if (!refInternal.trim()) {
            showAlert('Erro', 'Referência interna é obrigatória', 'error');
            return false;
        }
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
            showAlert('Erro', 'Preço inválido', 'error');
            return false;
        }
        if (!categoryId) {
            showAlert('Erro', 'Por favor, selecione uma categoria', 'error');
            return false;
        }
        if (!locationId) {
            showAlert('Erro', 'Por favor, selecione uma localização', 'error');
            return false;
        }
        
        return true;
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

    const handleSubmit = async () => {
        if (!validateForm()) return;

        if (!categoryId || !locationId) {
            return;
        }

        try {
            setLoading(true);
            
            const partData = {
                name: name.trim(),
                refInternal: refInternal.trim(),
                refOEM: refOEM.trim() || null,
                description: description.trim() || null,
                price: parseFloat(price),
                condition,
                categoryId,
                locationId,
                specifications: specifications
                    .filter(spec => spec.value.trim())
                    .map(spec => ({ specId: spec.specId, value: spec.value.trim() })),
                subReferences: subReferences
                    .filter(ref => ref.trim())
                    .map(ref => ref.trim()),
            };

            await createPart(partData);
            showAlert('Sucesso', 'Peça criada com sucesso!', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            showAlert('Erro', apiError.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Carregando dados...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header onProfilePress={() => router.push('/profile')} onLogoutPress={handleLogoutPress} />
            
            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={closeAlert}
            />

            <View style={styles.headerBar}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                
                <Text style={styles.headerTitle}>Nova Peça</Text>
                
                <TouchableOpacity 
                    onPress={handleSubmit} 
                    style={styles.saveButton}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>Guardar</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Informações Básicas</Text>
                    
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nome *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ex: Alternador"
                        />
                    </View>

                    <View style={styles.formRow}>
                        <View style={[styles.formGroup, styles.formGroupHalf]}>
                            <Text style={styles.label}>Ref. Interna *</Text>
                            <TextInput
                                style={styles.input}
                                value={refInternal}
                                onChangeText={setRefInternal}
                                placeholder="Ex: ALT-001"
                            />
                        </View>

                        <View style={[styles.formGroup, styles.formGroupHalf]}>
                            <Text style={styles.label}>Ref. OEM</Text>
                            <TextInput
                                style={styles.input}
                                value={refOEM}
                                onChangeText={setRefOEM}
                                placeholder="Ex: 12345678"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Descrição</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Descrição detalhada da peça"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.formRow}>
                        <View style={[styles.formGroup, styles.formGroupHalf]}>
                            <Text style={styles.label}>Preço (€) *</Text>
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={setPrice}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={[styles.formGroup, styles.formGroupHalf]}>
                            <Text style={styles.label}>Condição *</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={condition}
                                    onValueChange={setCondition}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Novo" value="NEW" />
                                    <Picker.Item label="Usado" value="USED" />
                                    <Picker.Item label="Recondicionado" value="REFURBISHED" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <View style={styles.formRow}>
                        <View style={[styles.formGroup, styles.formGroupHalf]}>
                            <Text style={styles.label}>Categoria *</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={categoryId}
                                    onValueChange={(value) => {
                                        console.log('🔄 Categoria selecionada:', value);
                                        setCategoryId(value);
                                    }}
                                    style={styles.picker}
                                    enabled={categories.length > 0}
                                >
                                    {categories.length === 0 ? (
                                        <Picker.Item label="Nenhuma categoria disponível" value={undefined} />
                                    ) : (
                                        categories.map(cat => {
                                            console.log('📋 Renderizando categoria:', cat);
                                            return <Picker.Item key={cat.id} label={cat.name} value={cat.id} />;
                                        })
                                    )}
                                </Picker>
                            </View>
                            {categories.length === 0 && (
                                <Text style={styles.helperText}>⚠️ Nenhuma categoria carregada</Text>
                            )}
                        </View>

                        <View style={[styles.formGroup, styles.formGroupHalf]}>
                            <Text style={styles.label}>Localização *</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={locationId}
                                    onValueChange={(value) => {
                                        console.log('🔄 Localização selecionada:', value);
                                        setLocationId(value);
                                    }}
                                    style={styles.picker}
                                    enabled={locations.length > 0}
                                >
                                    {locations.length === 0 ? (
                                        <Picker.Item label="Nenhuma localização disponível" value={undefined} />
                                    ) : (
                                        locations.map(loc => (
                                            <Picker.Item 
                                                key={loc.id} 
                                                label={`${loc.fullCode} (${loc.capacity - loc._count.parts}/${loc.capacity})`} 
                                                value={loc.id} 
                                            />
                                        ))
                                    )}
                                </Picker>
                            </View>
                            {locations.length === 0 && (
                                <Text style={styles.helperText}>⚠️ Nenhuma localização carregada</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Especificações */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Especificações</Text>
                        <TouchableOpacity onPress={addSpecification} style={styles.addButton}>
                            <Ionicons name="add-circle" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>

                    {specifications.map((spec, index) => (
                        <View key={index} style={styles.specRow}>
                            <View style={styles.specPickerContainer}>
                                <Picker
                                    selectedValue={spec.specId}
                                    onValueChange={(value) => updateSpecification(index, 'specId', value)}
                                    style={styles.picker}
                                >
                                    {availableSpecs.map(s => (
                                        <Picker.Item key={s.id} label={s.name} value={s.id} />
                                    ))}
                                </Picker>
                            </View>
                            <TextInput
                                style={[styles.input, styles.specInput]}
                                value={spec.value}
                                onChangeText={(value) => updateSpecification(index, 'value', value)}
                                placeholder="Valor"
                            />
                            <TouchableOpacity onPress={() => removeSpecification(index)}>
                                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {specifications.length === 0 && (
                        <Text style={styles.emptyText}>Nenhuma especificação adicionada</Text>
                    )}
                </View>

                {/* Sub-Referências */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Sub-Referências</Text>
                        <TouchableOpacity onPress={addSubReference} style={styles.addButton}>
                            <Ionicons name="add-circle" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>

                    {subReferences.map((ref, index) => (
                        <View key={index} style={styles.subRefRow}>
                            <TextInput
                                style={[styles.input, styles.subRefInput]}
                                value={ref}
                                onChangeText={(value) => updateSubReference(index, value)}
                                placeholder="Ex: REF-ALT-001"
                            />
                            <TouchableOpacity onPress={() => removeSubReference(index)}>
                                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={styles.bottomPadding} />
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    saveButtonText: {
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
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addButton: {
        padding: 4,
    },
    formGroup: {
        marginBottom: 16,
    },
    formRow: {
        flexDirection: 'row',
        gap: 16,
    },
    formGroupHalf: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
    },
    specRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    specPickerContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    specInput: {
        flex: 1,
    },
    subRefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    subRefInput: {
        flex: 1,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 14,
        fontStyle: 'italic',
        padding: 12,
    },
    bottomPadding: {
        height: 20,
    },
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    alertIcon: {
        marginBottom: 16,
    },
    alertIconError: {},
    alertIconSuccess: {},
    alertTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    alertMessage: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    alertButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    alertButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    helperText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
        fontStyle: 'italic',
    },
});

export default CreatePart;