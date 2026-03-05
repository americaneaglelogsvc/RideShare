import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDriverSocket } from '../../hooks/useSocket';

type TripPhase = 'en_route_pickup' | 'arrived' | 'waiting' | 'in_progress' | 'completed';

export default function ActiveTripScreen() {
    const { user } = useAuth();
    const socket = useDriverSocket(user?.id);
    const [phase, setPhase] = useState<TripPhase>('en_route_pickup');
    const [waitSeconds, setWaitSeconds] = useState(0);
    const waitTimer = useRef<NodeJS.Timeout | null>(null);

    const TRIP = {
        riderName: 'Sarah M.',
        pickup: '123 N Michigan Ave, Chicago',
        dropoff: "O'Hare Airport Terminal 2",
        category: 'BLACK SEDAN',
        estimatedFare: '$45.00',
    };

    useEffect(() => {
        if (phase === 'waiting') {
            waitTimer.current = setInterval(() => setWaitSeconds(s => s + 1), 1000);
        } else {
            if (waitTimer.current) clearInterval(waitTimer.current);
            setWaitSeconds(0);
        }
        return () => { if (waitTimer.current) clearInterval(waitTimer.current); };
    }, [phase]);

    const formatWait = (secs: number): string => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const advancePhase = () => {
        const next: Record<TripPhase, TripPhase> = {
            en_route_pickup: 'arrived',
            arrived: 'waiting',
            waiting: 'in_progress',
            in_progress: 'completed',
            completed: 'completed',
        };
        const nextPhase = next[phase];
        setPhase(nextPhase);
        if (socket) {
            socket.emit('trip_phase_update', { driverId: user?.id, phase: nextPhase });
        }
    };

    const phaseLabels: Record<TripPhase, string> = {
        en_route_pickup: 'Navigating to Pickup',
        arrived: 'Arrived at Pickup',
        waiting: 'Waiting for Rider',
        in_progress: 'Trip In Progress',
        completed: 'Trip Completed',
    };

    const actionLabels: Record<TripPhase, string> = {
        en_route_pickup: 'I Have Arrived',
        arrived: 'Start Waiting',
        waiting: 'Start Trip',
        in_progress: 'Complete Trip',
        completed: 'Done',
    };

    const isNoShow = phase === 'waiting' && waitSeconds >= 300;

    return (
        <View style={styles.container}>
            <View style={styles.phaseBar}>
                <Text style={styles.phaseText}>{phaseLabels[phase]}</Text>
            </View>

            <View style={styles.mapPlaceholder}>
                <Text style={styles.mapText}>[Live Navigation Map]</Text>
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.riderName}>{TRIP.riderName}</Text>
                <Text style={styles.category}>{TRIP.category}</Text>

                <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.locationText}>{TRIP.pickup}</Text>
                </View>
                <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.dotRed]} />
                    <Text style={styles.locationText}>{TRIP.dropoff}</Text>
                </View>

                <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Est. Fare</Text>
                    <Text style={styles.fareValue}>{TRIP.estimatedFare}</Text>
                </View>
            </View>

            {phase === 'waiting' && (
                <View style={styles.waitCard}>
                    <Text style={styles.waitLabel}>Wait Time</Text>
                    <Text style={[styles.waitTimer, isNoShow && styles.waitTimerRed]}>
                        {formatWait(waitSeconds)}
                    </Text>
                    {isNoShow && (
                        <TouchableOpacity style={styles.noShowBtn}>
                            <Text style={styles.noShowText}>Mark No-Show</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {phase !== 'completed' && (
                <TouchableOpacity
                    style={[styles.actionBtn, phase === 'in_progress' && styles.completeBtn]}
                    onPress={advancePhase}>
                    <Text style={styles.actionBtnText}>{actionLabels[phase]}</Text>
                </TouchableOpacity>
            )}

            {phase === 'completed' && (
                <View style={styles.completedCard}>
                    <Text style={styles.completedCheck}>✓</Text>
                    <Text style={styles.completedText}>Trip Completed</Text>
                    <Text style={styles.completedFare}>{TRIP.estimatedFare}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    phaseBar: { backgroundColor: '#ffb300', padding: 12, alignItems: 'center' },
    phaseText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    mapPlaceholder: { flex: 1, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' },
    mapText: { color: '#666', fontSize: 16 },
    infoCard: { backgroundColor: '#1a1a1a', padding: 16, marginHorizontal: 16, borderRadius: 12, marginTop: -30 },
    riderName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
    category: { color: '#ffb300', fontSize: 13, marginBottom: 12 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00c853', marginRight: 10 },
    dotRed: { backgroundColor: '#ff4444' },
    locationText: { color: '#ddd', fontSize: 14, flex: 1 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' },
    fareLabel: { color: '#aaa', fontSize: 14 },
    fareValue: { color: '#ffb300', fontSize: 18, fontWeight: 'bold' },
    waitCard: { backgroundColor: '#1a1a1a', margin: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
    waitLabel: { color: '#aaa', fontSize: 14, marginBottom: 4 },
    waitTimer: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
    waitTimerRed: { color: '#ff4444' },
    noShowBtn: { backgroundColor: '#ff4444', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, marginTop: 12 },
    noShowText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    actionBtn: { backgroundColor: '#ffb300', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
    completeBtn: { backgroundColor: '#00c853' },
    actionBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
    completedCard: { backgroundColor: '#1a1a1a', margin: 16, padding: 24, borderRadius: 12, alignItems: 'center' },
    completedCheck: { fontSize: 48, color: '#00c853', marginBottom: 8 },
    completedText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    completedFare: { color: '#ffb300', fontSize: 28, fontWeight: 'bold' },
});
