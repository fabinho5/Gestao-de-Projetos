import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import SearchBar from '../(shared)/SearchBar';

const Parts = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (text: string) => {
        console.log('Pesquisar por:', text);
        // Aqui você pode adicionar a lógica de pesquisa
    };

    const handleChangeText = (text: string) => {
        setSearchQuery(text);
        console.log('Texto alterado:', text);
    };

    return (
        <View style={styles.container}>
            <SearchBar
                placeholder="Pesquisar peças..."
                onSearch={handleSearch}
                onChangeText={handleChangeText}
            />
            
            <ScrollView style={styles.content}>
                <Text style={styles.info}>
                    {searchQuery 
                        ? `Pesquisando por: ${searchQuery}` 
                        : 'Digite para pesquisar peças'}
                </Text>
                {/* Aqui você pode adicionar a lista de peças */}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    info: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default Parts;
