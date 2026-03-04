import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { useEffect } from 'react';
import { initDatabase } from '../lib/database';

export default function Layout() {
    useEffect(() => {
        initDatabase().then(() => console.log('SQLite Initialized'));
    }, []);

    return (
        <AuthProvider>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'Driver Auth' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </AuthProvider>
    );
}
