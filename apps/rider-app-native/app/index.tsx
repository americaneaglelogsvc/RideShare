import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function RiderAuthScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>UrWay Dispatch</Text>
            <Text style={styles.subtitle}>Rider Application</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/(tabs)/home')}
            >
                <Text style={styles.buttonText}>Login with FaceID</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 18, color: '#aaa', marginBottom: 40 },
    button: { backgroundColor: '#1a73e8', padding: 15, borderRadius: 8, width: '80%', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
