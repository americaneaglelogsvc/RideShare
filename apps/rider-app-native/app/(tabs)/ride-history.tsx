import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';

const MOCK_TRIPS = [
    { id: '1', date: '2026-03-01', pickup: '123 N Michigan Ave', dropoff: "O'Hare Airport", fare: '$45.00', status: 'completed', rating: 5 },
    { id: '2', date: '2026-02-28', pickup: 'Union Station', dropoff: 'Navy Pier', fare: '$18.50', status: 'completed', rating: 4 },
    { id: '3', date: '2026-02-27', pickup: 'Millennium Park', dropoff: 'Wrigley Field', fare: '$22.00', status: 'cancelled', rating: 0 },
    { id: '4', date: '2026-02-25', pickup: 'Midway Airport', dropoff: 'The Loop', fare: '$32.00', status: 'completed', rating: 5 },
];

export default function RideHistoryScreen() {
    const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    const filtered = MOCK_TRIPS.filter(t => filter === 'all' || t.status === filter);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ride History</Text>

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
                            <Text style={[styles.tripStatus, item.status === 'cancelled' && styles.cancelled]}>
                                {item.status.toUpperCase()}
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
    filterActive: { backgroundColor: '#1a73e8' },
    filterText: { color: '#aaa', fontSize: 14 },
    filterTextActive: { color: '#fff' },
    tripCard: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12 },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    tripDate: { color: '#aaa', fontSize: 13 },
    tripStatus: { color: '#00c853', fontSize: 12, fontWeight: '600' },
    cancelled: { color: '#ff4444' },
    tripRoute: { color: '#fff', fontSize: 15, marginBottom: 8 },
    tripFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    tripFare: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    tripRating: { color: '#ffb300', fontSize: 16 },
    empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
