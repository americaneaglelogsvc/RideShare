import { Tabs } from 'expo-router';
import { Chrome as ChromeIcon, User, Car, Clock, MessageCircle, Star, HelpCircle, Shield, CreditCard, Calendar } from 'lucide-react-native';

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
                name="booking"
                options={{
                    title: 'Book',
                    tabBarIcon: ({ color }) => <Car size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="ride-history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="messaging"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="ratings"
                options={{ href: null, title: 'Rate Trip', tabBarIcon: ({ color }) => <Star size={24} color={color} /> }}
            />
            <Tabs.Screen
                name="support"
                options={{ href: null, title: 'Support', tabBarIcon: ({ color }) => <HelpCircle size={24} color={color} /> }}
            />
            <Tabs.Screen
                name="consent"
                options={{ href: null, title: 'Privacy', tabBarIcon: ({ color }) => <Shield size={24} color={color} /> }}
            />
            <Tabs.Screen
                name="split-pay"
                options={{ href: null, title: 'Split Pay', tabBarIcon: ({ color }) => <CreditCard size={24} color={color} /> }}
            />
            <Tabs.Screen
                name="hourly"
                options={{ href: null, title: 'Hourly', tabBarIcon: ({ color }) => <Clock size={24} color={color} /> }}
            />
            <Tabs.Screen
                name="scheduled"
                options={{ href: null, title: 'Schedule', tabBarIcon: ({ color }) => <Calendar size={24} color={color} /> }}
            />
        </Tabs>
    );
}
