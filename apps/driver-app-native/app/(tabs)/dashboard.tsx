import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDriverSocket } from '../../hooks/useSocket';
import { startBackgroundLocation } from '../../lib/location';

export default function DriverDashboardScreen() {
    const [isOnline, setIsOnline] = useState(false);
    const { user } = useAuth();
    const socket = useDriverSocket(user?.id);

    useEffect(() => {
        if (socket && isOnline) {
            socket.emit('driver_online', { driverId: user?.id });
            startBackgroundLocation(); // req-16.2 & background tracking

            socket.on('new_trip_request', (data) => {
                console.log('New trip request available:', data);
            });
        } else if (socket && !isOnline) {
            socket.emit('driver_offline', { driverId: user?.id });
        }
    }, [socket, isOnline]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Status: {isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                <Switch
                    value={isOnline}
                    onValueChange={setIsOnline}
                    trackColor={{ false: '#333', true: '#ffb300' }}
                />
            </View>

            <View style={styles.mapPlaceholder}>
                <Text style={styles.mapText}>[MapBox / Background Location Layer]</Text>
            </View>

            <View style={styles.statsPanel}>
                <Text style={styles.statText}>Today's Earnings: $124.50</Text>
                <Text style={styles.statText}>Completed Trips: 4</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    mapPlaceholder: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    mapText: { color: '#666', fontSize: 16 },
    statsPanel: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 12, gap: 10 },
    statText: { color: '#ffb300', fontSize: 18, fontWeight: '600' }
});
