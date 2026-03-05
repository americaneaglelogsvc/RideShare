import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

type ConsentItem = { key: string; label: string; description: string; granted: boolean };

const INITIAL_CONSENTS: ConsentItem[] = [
    { key: 'location', label: 'Location Tracking', description: 'Allow location data collection during rides for safety and navigation.', granted: true },
    { key: 'analytics', label: 'Analytics & Improvement', description: 'Help us improve by sharing anonymous usage data.', granted: true },
    { key: 'marketing', label: 'Marketing Communications', description: 'Receive promotional offers and updates via email and push.', granted: false },
    { key: 'third_party', label: 'Third-Party Data Sharing', description: 'Share ride data with insurance and fleet partners.', granted: false },
];

export default function ConsentScreen() {
    const [consents, setConsents] = useState<ConsentItem[]>(INITIAL_CONSENTS);

    const toggleConsent = (key: string) => {
        setConsents(prev => prev.map(c => c.key === key ? { ...c, granted: !c.granted } : c));
    };

    const requestDataExport = () => {
        Alert.alert('DSAR Submitted', 'Your data export request has been received. You will receive a download link within 30 days per CCPA/GDPR requirements.');
    };

    const requestDataDeletion = () => {
        Alert.alert(
            'Delete My Data',
            'This will permanently delete your personal data. Active trips must be completed first. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Request Submitted', 'Data deletion will be processed within 30 days.') },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Privacy & Consent</Text>

            <Text style={styles.sectionTitle}>Data Consents</Text>
            {consents.map(c => (
                <View key={c.key} style={styles.consentCard}>
                    <View style={styles.consentHeader}>
                        <Text style={styles.consentLabel}>{c.label}</Text>
                        <Switch value={c.granted} onValueChange={() => toggleConsent(c.key)}
                            trackColor={{ false: '#333', true: '#1a73e8' }} />
                    </View>
                    <Text style={styles.consentDesc}>{c.description}</Text>
                </View>
            ))}

            <Text style={styles.sectionTitle}>Legal Documents</Text>
            <View style={styles.linksCard}>
                <TouchableOpacity style={styles.linkItem}>
                    <Text style={styles.linkText}>Terms of Service</Text>
                    <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkItem}>
                    <Text style={styles.linkText}>Privacy Policy</Text>
                    <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkItem}>
                    <Text style={styles.linkText}>Cookie Policy</Text>
                    <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Data Subject Requests (DSAR)</Text>
            <TouchableOpacity style={styles.dsarBtn} onPress={requestDataExport}>
                <Text style={styles.dsarBtnText}>Request Data Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dsarBtn, styles.deleteBtn]} onPress={requestDataDeletion}>
                <Text style={styles.deleteBtnText}>Request Data Deletion</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 16 },
    sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
    consentCard: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 10 },
    consentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    consentLabel: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
    consentDesc: { color: '#888', fontSize: 13, lineHeight: 18 },
    linksCard: { backgroundColor: '#1a1a1a', borderRadius: 12, overflow: 'hidden' },
    linkItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    linkText: { color: '#1a73e8', fontSize: 15 },
    arrow: { color: '#666', fontSize: 18 },
    dsarBtn: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    dsarBtnText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
    deleteBtn: { borderWidth: 1, borderColor: '#ff4444' },
    deleteBtnText: { color: '#ff4444', fontSize: 15, fontWeight: '600' },
    spacer: { height: 60 },
});
