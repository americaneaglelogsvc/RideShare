import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function DriverSettingsScreen() {
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
                <View style={styles.item}>
                    <Text style={styles.itemText}>Vehicle Documents</Text>
                </View>
                <View style={styles.item}>
                    <Text style={styles.itemText}>Background Check</Text>
                </View>
                <View style={styles.item}>
                    <Text style={styles.itemText}>Payout Settings</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.card}>
                <View style={styles.item}>
                    <Text style={styles.itemText}>Navigation App</Text>
                </View>
                <View style={styles.item}>
                    <Text style={styles.itemText}>Notifications</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => router.replace('/')}
            >
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginLeft: 20, marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
    card: { backgroundColor: '#1a1a1a', marginHorizontal: 0 },
    item: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#222' },
    itemText: { color: '#fff', fontSize: 16 },
    logoutButton: { marginTop: 40, marginBottom: 60, padding: 15, alignItems: 'center' },
    logoutText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' }
});
