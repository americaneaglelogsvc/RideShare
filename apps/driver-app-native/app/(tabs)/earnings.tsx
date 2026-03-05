import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useState } from 'react';

const MOCK_EARNINGS = {
    today: 124.50,
    thisWeek: 842.75,
    thisMonth: 3245.00,
    trips: [
        { id: '1', time: '2:30 PM', route: 'Loop → O\'Hare', fare: 45.00, tip: 8.00 },
        { id: '2', time: '1:15 PM', route: 'Navy Pier → Wrigley', fare: 22.00, tip: 5.00 },
        { id: '3', time: '11:45 AM', route: 'Midway → Downtown', fare: 32.00, tip: 6.50 },
        { id: '4', time: '9:20 AM', route: 'Evanston → Loop', fare: 25.50, tip: 4.00 },
    ],
};

export default function EarningsScreen() {
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

    const amount = period === 'today' ? MOCK_EARNINGS.today
        : period === 'week' ? MOCK_EARNINGS.thisWeek
        : MOCK_EARNINGS.thisMonth;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Earnings</Text>

            <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>
                    {period === 'today' ? "Today's" : period === 'week' ? 'This Week' : 'This Month'} Earnings
                </Text>
                <Text style={styles.amount}>${amount.toFixed(2)}</Text>
            </View>

            <View style={styles.periodRow}>
                {([['today', 'Today'], ['week', 'Week'], ['month', 'Month']] as const).map(([key, label]) => (
                    <View key={key} style={[styles.periodBtn, period === key && styles.periodActive]}>
                        <Text style={[styles.periodText, period === key && styles.periodTextActive]}
                            onPress={() => setPeriod(key)}>{label}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Today's Trips</Text>
            {MOCK_EARNINGS.trips.map(trip => (
                <View key={trip.id} style={styles.tripRow}>
                    <View style={styles.tripInfo}>
                        <Text style={styles.tripTime}>{trip.time}</Text>
                        <Text style={styles.tripRoute}>{trip.route}</Text>
                    </View>
                    <View style={styles.tripAmounts}>
                        <Text style={styles.tripFare}>${trip.fare.toFixed(2)}</Text>
                        <Text style={styles.tripTip}>+${trip.tip.toFixed(2)} tip</Text>
                    </View>
                </View>
            ))}

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Base Fares</Text>
                    <Text style={styles.summaryValue}>${MOCK_EARNINGS.trips.reduce((s, t) => s + t.fare, 0).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tips</Text>
                    <Text style={styles.summaryValue}>${MOCK_EARNINGS.trips.reduce((s, t) => s + t.tip, 0).toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Net Total</Text>
                    <Text style={styles.totalValue}>
                        ${MOCK_EARNINGS.trips.reduce((s, t) => s + t.fare + t.tip, 0).toFixed(2)}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 16 },
    amountCard: { backgroundColor: '#1a1a1a', padding: 28, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
    amountLabel: { color: '#aaa', fontSize: 14, marginBottom: 4 },
    amount: { color: '#ffb300', fontSize: 44, fontWeight: 'bold' },
    periodRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    periodBtn: { flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    periodActive: { backgroundColor: '#ffb300' },
    periodText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
    periodTextActive: { color: '#000' },
    sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },
    tripRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1a1a1a', padding: 14, borderRadius: 10, marginBottom: 8 },
    tripInfo: { flex: 1 },
    tripTime: { color: '#666', fontSize: 12, marginBottom: 2 },
    tripRoute: { color: '#fff', fontSize: 14 },
    tripAmounts: { alignItems: 'flex-end' },
    tripFare: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    tripTip: { color: '#00c853', fontSize: 12 },
    summaryCard: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 12, marginTop: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { color: '#aaa', fontSize: 14 },
    summaryValue: { color: '#fff', fontSize: 14 },
    totalRow: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 4, marginBottom: 0 },
    totalLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    totalValue: { color: '#ffb300', fontSize: 22, fontWeight: 'bold' },
    spacer: { height: 60 },
});
