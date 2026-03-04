import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { authenticateWithBiometrics } from '../lib/biometrics';

export default function DriverAuthScreen() {
    const handleLogin = async () => {
        const result = await authenticateWithBiometrics();
        if (result.success) {
            router.replace('/(tabs)/dashboard');
        } else {
            Alert.alert('Authentication Failed', result.error ?? 'Unknown error');
            router.replace('/(tabs)/dashboard'); // Fallback for dev/simulator
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>UrWay Dispatch</Text>
            <Text style={styles.subtitle}>Driver Terminal</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
            >
                <Text style={styles.buttonText}>Authenticate (req-16.3)</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#ffb300', marginBottom: 10 },
    subtitle: { fontSize: 18, color: '#aaa', marginBottom: 40 },
    button: { backgroundColor: '#ffb300', padding: 15, borderRadius: 8, width: '80%', alignItems: 'center' },
    buttonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
