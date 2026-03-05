import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { riderApi } from '../../lib/api';

const RATES: Record<string, number> = {
    black_sedan: 65,
    black_suv: 85,
    premium: 55,
    standard: 45,
};

export default function HourlyBookingScreen() {
    const [pickup, setPickup] = useState('');
    const [hours, setHours] = useState(2);
    const [category, setCategory] = useState('black_sedan');
    const [instructions, setInstructions] = useState('');

    const rate = RATES[category] || 65;
    const total = rate * hours;

    const submitBooking = async () => {
        if (!pickup.trim()) {
            Alert.alert('Missing Info', 'Please enter a pickup location');
            return;
        }
        try {
            await riderApi.createHourlyBooking({ pickup, hours, category, instructions });
            Alert.alert('Booked', `${hours}-hour chauffeur confirmed. Total: $${total}`);
        } catch {
            Alert.alert('Error', 'Failed to create hourly booking');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Hourly Chauffeur</Text>
            <Text style={styles.subtitle}>Book a driver by the hour for flexible trips</Text>

            <Text style={styles.label}>Pickup Location</Text>
            <TextInput style={styles.input} value={pickup} onChangeText={setPickup}
                placeholder="Enter pickup address" placeholderTextColor="#666" />

            <Text style={styles.label}>Duration (hours)</Text>
            <View style={styles.durationRow}>
                <TouchableOpacity style={styles.durationBtn} onPress={() => setHours(Math.max(2, hours - 1))}>
                    <Text style={styles.durationBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.durationValue}>{hours}h</Text>
                <TouchableOpacity style={styles.durationBtn} onPress={() => setHours(Math.min(12, hours + 1))}>
                    <Text style={styles.durationBtnText}>+</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.durationHint}>Minimum 2 hours, maximum 12 hours</Text>

            <Text style={styles.label}>Vehicle Category</Text>
            <View style={styles.categories}>
                {Object.keys(RATES).map(cat => (
                    <TouchableOpacity key={cat}
                        style={[styles.catBtn, category === cat && styles.catActive]}
                        onPress={() => setCategory(cat)}>
                        <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                            {cat.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={[styles.catRate, category === cat && styles.catTextActive]}>
                            ${RATES[cat]}/hr
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Special Instructions</Text>
            <TextInput style={[styles.input, styles.textArea]} value={instructions} onChangeText={setInstructions}
                placeholder="Any special requests..." placeholderTextColor="#666"
                multiline numberOfLines={3} textAlignVertical="top" />

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Rate</Text>
                    <Text style={styles.summaryValue}>${rate}/hr</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>{hours} hours</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${total}</Text>
                </View>
                <Text style={styles.overageNote}>Overage billed at ${Math.round(rate * 1.5)}/hr</Text>
            </View>

            <TouchableOpacity style={styles.bookBtn} onPress={submitBooking}>
                <Text style={styles.bookBtnText}>Confirm Hourly Booking</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20 },
    subtitle: { color: '#aaa', fontSize: 15, marginBottom: 20, marginTop: 4 },
    label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' },
    input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 14, borderRadius: 10, fontSize: 15 },
    textArea: { minHeight: 70 },
    durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
    durationBtn: { backgroundColor: '#1a73e8', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    durationBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    durationValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', minWidth: 60, textAlign: 'center' },
    durationHint: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 6 },
    categories: { gap: 8 },
    catBtn: { backgroundColor: '#1a1a1a', padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
    catActive: { backgroundColor: '#1a73e8' },
    catText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
    catRate: { color: '#666', fontSize: 14 },
    catTextActive: { color: '#fff' },
    summaryCard: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 12, marginTop: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { color: '#aaa', fontSize: 14 },
    summaryValue: { color: '#fff', fontSize: 14 },
    totalRow: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 4, marginBottom: 0 },
    totalLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    totalValue: { color: '#00c853', fontSize: 22, fontWeight: 'bold' },
    overageNote: { color: '#ffb300', fontSize: 12, marginTop: 8, textAlign: 'center' },
    bookBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    bookBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    spacer: { height: 60 },
});
