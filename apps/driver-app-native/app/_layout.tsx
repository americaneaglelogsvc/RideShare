import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { useEffect } from 'react';
import { initDatabase } from '../lib/database';
import { driverApi } from '../lib/api';
import { registerForPushNotifications } from '../lib/notifications';
import { syncOfflineActions } from '../lib/sync';

export default function Layout() {
    useEffect(() => {
        (async () => {
            const db = await initDatabase();
            console.log('SQLite Initialized');

            await driverApi.init();
            console.log('API client initialized, tenant:', driverApi.getTenantId());

            // Set tenant from build-time env if available
            const envTenant = process.env.EXPO_PUBLIC_TENANT_ID;
            if (envTenant && !driverApi.getTenantId()) {
                await driverApi.setTenantId(envTenant);
            }

            registerForPushNotifications()
                .then(token => token && console.log('Push token:', token))
                .catch(err => console.warn('Push registration failed:', err));

            // Sync any queued offline actions
            const synced = await syncOfflineActions(db);
            if (synced > 0) console.log(`Synced ${synced} offline action(s)`);
        })();
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
