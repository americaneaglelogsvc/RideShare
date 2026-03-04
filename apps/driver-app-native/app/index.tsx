import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function DriverAuthScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>UrWay Dispatch</Text>
            <Text style={styles.subtitle}>Driver Terminal</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/(tabs)/dashboard')}
            >
                <Text style={styles.buttonText}>Authenticate (FaceID)</Text>
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
