import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useRiderSocket } from '../../hooks/useSocket';
import { useEffect } from 'react';

export default function RiderHomeScreen() {
    const { user } = useAuth();
    const socket = useRiderSocket(user?.id);

    useEffect(() => {
        if (socket) {
            socket.on('trip_update', (data) => {
                console.log('Trip update received:', data);
            });
        }
    }, [socket]);

    const requestRide = () => {
        if (socket) {
            socket.emit('request_trip', { riderId: user?.id, pickup: 'Current Location', dropoff: 'Destination' });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Where to?</Text>
            <View style={styles.mapPlaceholder}>
                <Text style={styles.mapText}>[MapBox / Google Maps Native Layer]</Text>
            </View>
            <TouchableOpacity style={styles.bookButton} onPress={requestRide}>
                <Text style={styles.buttonText}>Request Ride (req-16.1)</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 40, marginBottom: 20 },
    mapPlaceholder: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    mapText: { color: '#666', fontSize: 16 },
    bookButton: { backgroundColor: '#1a73e8', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
