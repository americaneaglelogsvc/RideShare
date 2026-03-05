import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';

const MOCK_TRIPS = [
    { id: '1', date: '2026-03-03', pickup: 'The Loop', dropoff: "O'Hare Terminal 1", fare: '$45.00', rating: 5, status: 'completed' },
    { id: '2', date: '2026-03-03', pickup: 'Navy Pier', dropoff: 'Wrigley Field', fare: '$22.00', rating: 4, status: 'completed' },
    { id: '3', date: '2026-03-02', pickup: 'Midway Airport', dropoff: 'Gold Coast', fare: '$38.00', rating: 5, status: 'completed' },
    { id: '4', date: '2026-03-02', pickup: 'Lincoln Park', dropoff: 'South Loop', fare: '$15.50', rating: 0, status: 'cancelled_rider' },
    { id: '5', date: '2026-03-01', pickup: 'Evanston', dropoff: 'Loop', fare: '$28.00', rating: 5, status: 'completed' },
];

export default function TripHistoryScreen() {
    const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    const filtered = MOCK_TRIPS.filter(t => {
        if (filter === 'all') return true;
        if (filter === 'completed') return t.status === 'completed';
        return t.status.startsWith('cancelled');
    });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trip History</Text>

            <View style={styles.filters}>
                {(['all', 'completed', 'cancelled'] as const).map(f => (
                    <TouchableOpacity key={f}
                        style={[styles.filterBtn, filter === f && styles.filterActive]}
                        onPress={() => setFilter(f)}>
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.tripCard}>
                        <View style={styles.tripHeader}>
                            <Text style={styles.tripDate}>{item.date}</Text>
                            <Text style={[styles.tripStatus, item.status !== 'completed' && styles.cancelled]}>
                                {item.status === 'completed' ? 'COMPLETED' : 'CANCELLED'}
                            </Text>
                        </View>
                        <Text style={styles.tripRoute}>{item.pickup} → {item.dropoff}</Text>
                        <View style={styles.tripFooter}>
                            <Text style={styles.tripFare}>{item.fare}</Text>
                            {item.rating > 0 && (
                                <Text style={styles.tripRating}>{'★'.repeat(item.rating)}</Text>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No trips found</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 16 },
    filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    filterBtn: { backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    filterActive: { backgroundColor: '#ffb300' },
    filterText: { color: '#aaa', fontSize: 14 },
    filterTextActive: { color: '#000' },
    tripCard: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12 },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    tripDate: { color: '#aaa', fontSize: 13 },
    tripStatus: { color: '#00c853', fontSize: 12, fontWeight: '600' },
    cancelled: { color: '#ff4444' },
    tripRoute: { color: '#fff', fontSize: 15, marginBottom: 8 },
    tripFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    tripFare: { color: '#ffb300', fontSize: 18, fontWeight: 'bold' },
    tripRating: { color: '#ffb300', fontSize: 16 },
    empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
