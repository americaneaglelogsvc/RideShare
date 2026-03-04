import { Tabs } from 'expo-router';
import { Chrome as ChromeIcon, User } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#1a73e8', tabBarStyle: { backgroundColor: '#121212' }, headerStyle: { backgroundColor: '#121212' }, headerTintColor: '#fff' }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <ChromeIcon size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
