import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useState } from 'react';

type Participant = { id: string; name: string; share: number };

export default function SplitPayScreen() {
    const [mode, setMode] = useState<'equal' | 'percentage' | 'custom'>('equal');
    const [totalFare] = useState(45.00);
    const [participants, setParticipants] = useState<Participant[]>([
        { id: '1', name: 'You', share: 0 },
    ]);
    const [newName, setNewName] = useState('');

    const addParticipant = () => {
        if (!newName.trim()) return;
        setParticipants(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), share: 0 }]);
        setNewName('');
    };

    const removeParticipant = (id: string) => {
        if (id === '1') return;
        setParticipants(prev => prev.filter(p => p.id !== id));
    };

    const getShare = (index: number): number => {
        if (mode === 'equal') return totalFare / participants.length;
        return participants[index].share;
    };

    const sendRequests = () => {
        Alert.alert('Split Pay Sent', `Payment requests sent to ${participants.length - 1} participant(s).`);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Split Payment</Text>

            <View style={styles.fareCard}>
                <Text style={styles.fareLabel}>Total Fare</Text>
                <Text style={styles.fareAmount}>${totalFare.toFixed(2)}</Text>
            </View>

            <View style={styles.modeRow}>
                {(['equal', 'percentage', 'custom'] as const).map(m => (
                    <TouchableOpacity key={m}
                        style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                        onPress={() => setMode(m)}>
                        <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
            {participants.map((p, i) => (
                <View key={p.id} style={styles.participantRow}>
                    <Text style={styles.participantName}>{p.name}</Text>
                    <Text style={styles.participantShare}>${getShare(i).toFixed(2)}</Text>
                    {p.id !== '1' && (
                        <TouchableOpacity onPress={() => removeParticipant(p.id)}>
                            <Text style={styles.removeBtn}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}

            <View style={styles.addRow}>
                <TextInput style={styles.addInput} value={newName} onChangeText={setNewName}
                    placeholder="Add participant name" placeholderTextColor="#666" />
                <TouchableOpacity style={styles.addBtn} onPress={addParticipant}>
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sendBtn} onPress={sendRequests}
                disabled={participants.length < 2}>
                <Text style={styles.sendBtnText}>Send Split Requests</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 16 },
    fareCard: { backgroundColor: '#1a1a1a', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
    fareLabel: { color: '#aaa', fontSize: 14, marginBottom: 4 },
    fareAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    modeBtn: { flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    modeBtnActive: { backgroundColor: '#1a73e8' },
    modeText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
    modeTextActive: { color: '#fff' },
    sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: '600', marginBottom: 10 },
    participantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 14, borderRadius: 10, marginBottom: 8 },
    participantName: { flex: 1, color: '#fff', fontSize: 15 },
    participantShare: { color: '#00c853', fontSize: 16, fontWeight: 'bold', marginRight: 12 },
    removeBtn: { color: '#ff4444', fontSize: 18, paddingHorizontal: 4 },
    addRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 24 },
    addInput: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 10, fontSize: 15 },
    addBtn: { backgroundColor: '#1a73e8', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    sendBtn: { backgroundColor: '#00c853', padding: 16, borderRadius: 12, alignItems: 'center' },
    sendBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    spacer: { height: 60 },
});
