import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef } from 'react';

type Message = { id: string; text: string; sender: 'rider' | 'driver'; time: string };

const MOCK_MESSAGES: Message[] = [
    { id: '1', text: 'I am on my way to the pickup location.', sender: 'driver', time: '2:30 PM' },
    { id: '2', text: 'Great, I am at the lobby entrance.', sender: 'rider', time: '2:31 PM' },
    { id: '3', text: 'I see you. Black sedan pulling up now.', sender: 'driver', time: '2:33 PM' },
];

export default function MessagingScreen() {
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
    const [input, setInput] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = () => {
        if (!input.trim()) return;
        const newMsg: Message = {
            id: Date.now().toString(),
            text: input.trim(),
            sender: 'rider',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.title}>Messages</Text>
            <View style={styles.piiNotice}>
                <Text style={styles.piiText}>Messages are PII-masked for your safety</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                style={styles.messageList}
                renderItem={({ item }) => (
                    <View style={[styles.bubble, item.sender === 'rider' ? styles.riderBubble : styles.driverBubble]}>
                        <Text style={styles.bubbleText}>{item.text}</Text>
                        <Text style={styles.bubbleTime}>{item.time}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No messages yet</Text>}
            />

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#666"
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', padding: 20, paddingBottom: 0 },
    piiNotice: { backgroundColor: '#1a1a1a', marginHorizontal: 20, marginTop: 8, padding: 8, borderRadius: 8 },
    piiText: { color: '#ffb300', fontSize: 12, textAlign: 'center' },
    messageList: { flex: 1, paddingHorizontal: 20, marginTop: 12 },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
    riderBubble: { backgroundColor: '#1a73e8', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    driverBubble: { backgroundColor: '#2a2a2a', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    bubbleText: { color: '#fff', fontSize: 15 },
    bubbleTime: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, textAlign: 'right' },
    empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
    inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#222', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 24, fontSize: 15, marginRight: 8 },
    sendBtn: { backgroundColor: '#1a73e8', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24 },
    sendText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
