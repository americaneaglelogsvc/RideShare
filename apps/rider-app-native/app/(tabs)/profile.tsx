import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function RiderProfileScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarPlaceholder} />
                <Text style={styles.name}>John Doe</Text>
                <Text style={styles.email}>john.doe@example.com</Text>
            </View>

            <View style={styles.menu}>
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuText}>Payment Methods</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuText}>Trip History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuText}>Safety Toolkit</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => router.replace('/')}
            >
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    header: { alignItems: 'center', marginVertical: 40 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#333', marginBottom: 15 },
    name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    email: { fontSize: 16, color: '#aaa' },
    menu: { backgroundColor: '#1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 40 },
    menuItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
    menuText: { color: '#fff', fontSize: 16 },
    logoutButton: { padding: 15, alignItems: 'center' },
    logoutText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' }
});
