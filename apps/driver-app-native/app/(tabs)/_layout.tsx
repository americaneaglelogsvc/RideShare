import { Tabs } from 'expo-router';
import { LayoutDashboard, Settings } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#ffb300', tabBarStyle: { backgroundColor: '#121212' }, headerStyle: { backgroundColor: '#121212' }, headerTintColor: '#fff' }}>
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
