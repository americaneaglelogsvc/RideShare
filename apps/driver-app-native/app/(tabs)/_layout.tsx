import { Tabs } from 'expo-router';
import { LayoutDashboard, Settings, DollarSign, Clock, Calendar, Navigation } from 'lucide-react-native';

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
                name="earnings"
                options={{
                    title: 'Earnings',
                    tabBarIcon: ({ color }) => <DollarSign size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="trip-history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="scheduled-rides"
                options={{ href: null, title: 'Scheduled', tabBarIcon: ({ color }) => <Calendar size={24} color={color} /> }}
            />
            <Tabs.Screen
                name="active-trip"
                options={{ href: null, title: 'Active Trip', tabBarIcon: ({ color }) => <Navigation size={24} color={color} /> }}
            />
        </Tabs>
    );
}
