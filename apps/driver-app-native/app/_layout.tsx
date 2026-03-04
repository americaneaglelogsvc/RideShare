import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

export default function Layout() {
    return (
        <AuthProvider>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'Driver Auth' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </AuthProvider>
    );
}
