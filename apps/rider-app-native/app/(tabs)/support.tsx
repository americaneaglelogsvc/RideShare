import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useState } from 'react';

type Issue = { id: string; type: string; subject: string; status: 'open' | 'resolved' | 'pending'; date: string };

const MOCK_ISSUES: Issue[] = [
    { id: '1', type: 'Billing', subject: 'Overcharged on trip #1234', status: 'resolved', date: '2026-02-28' },
    { id: '2', type: 'Safety', subject: 'Driver behavior concern', status: 'pending', date: '2026-03-01' },
];

const ISSUE_TYPES = ['Billing', 'Safety', 'Lost Item', 'Driver Complaint', 'App Issue', 'Other'];

export default function SupportScreen() {
    const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);
    const [showNew, setShowNew] = useState(false);
    const [newType, setNewType] = useState('Billing');
    const [newSubject, setNewSubject] = useState('');
    const [newDetails, setNewDetails] = useState('');

    const submitIssue = () => {
        if (!newSubject.trim()) return;
        const issue: Issue = {
            id: Date.now().toString(),
            type: newType,
            subject: newSubject.trim(),
            status: 'open',
            date: new Date().toISOString().split('T')[0],
        };
        setIssues(prev => [issue, ...prev]);
        setShowNew(false);
        setNewSubject('');
        setNewDetails('');
    };

    const statusColor = (s: string) => s === 'resolved' ? '#00c853' : s === 'pending' ? '#ffb300' : '#1a73e8';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Support</Text>
                <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)}>
                    <Text style={styles.newBtnText}>+ New Issue</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={issues}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.issueCard}>
                        <View style={styles.issueHeader}>
                            <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
                                <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.issueDate}>{item.date}</Text>
                        </View>
                        <Text style={styles.issueType}>{item.type}</Text>
                        <Text style={styles.issueSubject}>{item.subject}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No support issues</Text>}
            />

            <Modal visible={showNew} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>New Support Issue</Text>

                        <Text style={styles.label}>Category</Text>
                        <View style={styles.typeRow}>
                            {ISSUE_TYPES.map(t => (
                                <TouchableOpacity key={t}
                                    style={[styles.typeBtn, newType === t && styles.typeBtnActive]}
                                    onPress={() => setNewType(t)}>
                                    <Text style={[styles.typeText, newType === t && styles.typeTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Subject</Text>
                        <TextInput style={styles.input} value={newSubject} onChangeText={setNewSubject}
                            placeholder="Brief description" placeholderTextColor="#666" />

                        <Text style={styles.label}>Details</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={newDetails} onChangeText={setNewDetails}
                            placeholder="Provide more context..." placeholderTextColor="#666"
                            multiline numberOfLines={4} textAlignVertical="top" />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNew(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={submitIssue}>
                                <Text style={styles.submitText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    newBtn: { backgroundColor: '#1a73e8', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    issueCard: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12 },
    issueHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    issueDate: { color: '#666', fontSize: 13 },
    issueType: { color: '#aaa', fontSize: 12, marginBottom: 4 },
    issueSubject: { color: '#fff', fontSize: 15 },
    empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
    label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 12 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    typeBtn: { backgroundColor: '#222', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
    typeBtnActive: { backgroundColor: '#1a73e8' },
    typeText: { color: '#aaa', fontSize: 12 },
    typeTextActive: { color: '#fff' },
    input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 10, fontSize: 15 },
    textArea: { minHeight: 80 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
    cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#333' },
    cancelText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
    submitBtn: { flex: 1, backgroundColor: '#1a73e8', padding: 14, alignItems: 'center', borderRadius: 10 },
    submitText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
