import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { riderApi } from '../../lib/api';

export default function ScheduledBookingScreen() {
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [category, setCategory] = useState('black_sedan');
    const [passengers, setPassengers] = useState(1);
    const [luggage, setLuggage] = useState(0);

    const submitScheduled = async () => {
        if (!pickup.trim() || !dropoff.trim() || !date || !time) {
            Alert.alert('Missing Info', 'Please fill in all required fields');
            return;
        }
        try {
            await riderApi.createScheduledBooking({
                pickup, dropoff, date, time, category, passengers, luggage,
            });
            Alert.alert('Scheduled', 'Your ride has been scheduled successfully.');
        } catch {
            Alert.alert('Error', 'Failed to schedule ride');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Schedule a Ride</Text>
            <Text style={styles.subtitle}>Book ahead for airport transfers, events, or any planned trip</Text>

            <Text style={styles.label}>Pickup Location</Text>
            <TextInput style={styles.input} value={pickup} onChangeText={setPickup}
                placeholder="Enter pickup address" placeholderTextColor="#666" />

            <Text style={styles.label}>Dropoff Location</Text>
            <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff}
                placeholder="Enter destination" placeholderTextColor="#666" />

            <View style={styles.row}>
                <View style={styles.half}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput style={styles.input} value={date} onChangeText={setDate}
                        placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
                </View>
                <View style={styles.half}>
                    <Text style={styles.label}>Time</Text>
                    <TextInput style={styles.input} value={time} onChangeText={setTime}
                        placeholder="HH:MM" placeholderTextColor="#666" />
                </View>
            </View>

            <Text style={styles.label}>Vehicle Category</Text>
            <View style={styles.categories}>
                {['black_sedan', 'black_suv', 'premium', 'standard'].map(cat => (
                    <TouchableOpacity key={cat}
                        style={[styles.catBtn, category === cat && styles.catActive]}
                        onPress={() => setCategory(cat)}>
                        <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                            {cat.replace('_', ' ').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.row}>
                <View style={styles.half}>
                    <Text style={styles.label}>Passengers</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setPassengers(Math.max(1, passengers - 1))}>
                            <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{passengers}</Text>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setPassengers(Math.min(8, passengers + 1))}>
                            <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.half}>
                    <Text style={styles.label}>Luggage</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setLuggage(Math.max(0, luggage - 1))}>
                            <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{luggage}</Text>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => setLuggage(Math.min(6, luggage + 1))}>
                            <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.bookBtn} onPress={submitScheduled}>
                <Text style={styles.bookBtnText}>Schedule Ride</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20 },
    subtitle: { color: '#aaa', fontSize: 15, marginBottom: 16, marginTop: 4 },
    label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
    input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 14, borderRadius: 10, fontSize: 15 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catBtn: { backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
    catActive: { backgroundColor: '#1a73e8' },
    catText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
    catTextActive: { color: '#fff' },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#1a1a1a', padding: 8, borderRadius: 10 },
    stepBtn: { backgroundColor: '#1a73e8', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    stepBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    stepValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
    bookBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
    bookBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    spacer: { height: 60 },
});
