import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { riderApi } from '../../lib/api';

export default function BookingScreen() {
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [category, setCategory] = useState('black_sedan');
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const getQuote = async () => {
        setLoading(true);
        try {
            const result = await riderApi.getQuote({
                category,
                service: 'on_demand',
                pickup: { lat: 41.8781, lng: -87.6298, address: pickup },
                dropoff: { lat: 41.9786, lng: -87.9048, address: dropoff },
            });
            setQuote(result);
        } catch (e) {
            console.error('Quote error:', e);
        }
        setLoading(false);
    };

    const bookRide = async () => {
        try {
            await riderApi.bookRide({ pickup, dropoff, category });
        } catch (e) {
            console.error('Booking error:', e);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Book a Ride</Text>

            <Text style={styles.label}>Pickup Location</Text>
            <TextInput style={styles.input} value={pickup} onChangeText={setPickup}
                placeholder="Enter pickup address" placeholderTextColor="#666" />

            <Text style={styles.label}>Dropoff Location</Text>
            <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff}
                placeholder="Enter destination" placeholderTextColor="#666" />

            <Text style={styles.label}>Vehicle Category</Text>
            <View style={styles.categories}>
                {['black_sedan', 'black_suv', 'premium', 'standard'].map(cat => (
                    <TouchableOpacity key={cat}
                        style={[styles.catButton, category === cat && styles.catActive]}
                        onPress={() => setCategory(cat)}>
                        <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                            {cat.replace('_', ' ').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.quoteButton} onPress={getQuote} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Getting Quote...' : 'Get Quote'}</Text>
            </TouchableOpacity>

            {quote && (
                <View style={styles.quoteCard}>
                    <Text style={styles.quoteTitle}>Estimated Fare</Text>
                    <Text style={styles.quotePrice}>${(quote.total_cents / 100).toFixed(2)}</Text>
                    <TouchableOpacity style={styles.bookButton} onPress={bookRide}>
                        <Text style={styles.buttonText}>Confirm Booking</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 20 },
    label: { fontSize: 14, color: '#aaa', marginBottom: 6, marginTop: 16 },
    input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 14, borderRadius: 10, fontSize: 16 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    catButton: { backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
    catActive: { backgroundColor: '#1a73e8' },
    catText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
    catTextActive: { color: '#fff' },
    quoteButton: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
    bookButton: { backgroundColor: '#00c853', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    quoteCard: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 12, marginTop: 20, alignItems: 'center' },
    quoteTitle: { color: '#aaa', fontSize: 14, marginBottom: 4 },
    quotePrice: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
});
