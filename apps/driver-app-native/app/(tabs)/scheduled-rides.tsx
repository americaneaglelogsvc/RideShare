import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

type ScheduledRide = {
    id: string;
    pickup: string;
    dropoff: string;
    date: string;
    time: string;
    category: string;
    passengerName: string;
    status: 'pending' | 'confirmed' | 'declined';
};

const MOCK_SCHEDULED: ScheduledRide[] = [
    { id: '1', pickup: '123 N Michigan Ave', dropoff: "O'Hare Terminal 2", date: '2026-03-04', time: '06:00 AM', category: 'BLACK SEDAN', passengerName: 'Sarah M.', status: 'pending' },
    { id: '2', pickup: 'Hilton Chicago', dropoff: 'McCormick Place', date: '2026-03-04', time: '08:30 AM', category: 'BLACK SUV', passengerName: 'James K.', status: 'confirmed' },
    { id: '3', pickup: 'Union Station', dropoff: 'Midway Airport', date: '2026-03-05', time: '02:00 PM', category: 'PREMIUM', passengerName: 'Alex W.', status: 'pending' },
];

export default function ScheduledRidesScreen() {
    const [rides, setRides] = useState<ScheduledRide[]>(MOCK_SCHEDULED);

    const confirmRide = (id: string) => {
        setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' } : r));
        Alert.alert('Confirmed', 'Ride has been confirmed. Navigate to pickup when ready.');
    };

    const declineRide = (id: string) => {
        setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'declined' } : r));
    };

    const timeUntil = (date: string, time: string): string => {
        const target = new Date(`${date} ${time}`);
        const now = new Date();
        const diffMs = target.getTime() - now.getTime();
        if (diffMs <= 0) return 'Now';
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Scheduled Rides</Text>

            <FlatList
                data={rides.filter(r => r.status !== 'declined')}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.rideCard}>
                        <View style={styles.rideHeader}>
                            <View style={[styles.badge, item.status === 'confirmed' ? styles.badgeConfirmed : styles.badgePending]}>
                                <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.timeUntil}>In {timeUntil(item.date, item.time)}</Text>
                        </View>

                        <Text style={styles.datetime}>{item.date} at {item.time}</Text>
                        <Text style={styles.passenger}>{item.passengerName} · {item.category}</Text>
                        <Text style={styles.route}>{item.pickup}</Text>
                        <Text style={styles.routeArrow}>↓</Text>
                        <Text style={styles.route}>{item.dropoff}</Text>

                        {item.status === 'pending' && (
                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmRide(item.id)}>
                                    <Text style={styles.confirmText}>Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.declineBtn} onPress={() => declineRide(item.id)}>
                                    <Text style={styles.declineText}>Decline</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {item.status === 'confirmed' && (
                            <TouchableOpacity style={styles.navBtn}>
                                <Text style={styles.navBtnText}>Navigate to Pickup</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No scheduled rides</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 16 },
    rideCard: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12 },
    rideHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
    badgeConfirmed: { backgroundColor: '#00c853' },
    badgePending: { backgroundColor: '#ffb300' },
    badgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
    timeUntil: { color: '#ffb300', fontSize: 13, fontWeight: '600' },
    datetime: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
    passenger: { color: '#aaa', fontSize: 13, marginBottom: 10 },
    route: { color: '#ddd', fontSize: 14 },
    routeArrow: { color: '#666', fontSize: 14, marginLeft: 4 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    confirmBtn: { flex: 1, backgroundColor: '#00c853', padding: 12, borderRadius: 10, alignItems: 'center' },
    confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    declineBtn: { flex: 1, backgroundColor: '#333', padding: 12, borderRadius: 10, alignItems: 'center' },
    declineText: { color: '#ff4444', fontWeight: 'bold', fontSize: 14 },
    navBtn: { backgroundColor: '#ffb300', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 14 },
    navBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
    empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
