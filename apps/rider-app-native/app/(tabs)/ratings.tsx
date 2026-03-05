import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { riderApi } from '../../lib/api';

const TAGS = ['Professional', 'Clean Vehicle', 'Great Conversation', 'Smooth Ride', 'Safe Driver', 'On Time'];

export default function RatingsScreen() {
    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const submitRating = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please select a star rating');
            return;
        }
        try {
            await riderApi.submitRating({
                tripId: 'latest',
                rating,
                tags: selectedTags,
                comment: comment.trim() || undefined,
            });
            setSubmitted(true);
        } catch {
            Alert.alert('Error', 'Failed to submit rating');
        }
    };

    if (submitted) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.thankYou}>Thank You!</Text>
                <Text style={styles.subtitle}>Your feedback helps improve the experience</Text>
                <TouchableOpacity style={styles.doneBtn} onPress={() => { setSubmitted(false); setRating(0); setSelectedTags([]); setComment(''); }}>
                    <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Rate Your Trip</Text>

            <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(s => (
                    <TouchableOpacity key={s} onPress={() => setRating(s)}>
                        <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.ratingLabel}>
                {rating === 0 ? 'Tap a star' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
            </Text>

            <Text style={styles.sectionTitle}>What went well?</Text>
            <View style={styles.tags}>
                {TAGS.map(tag => (
                    <TouchableOpacity key={tag}
                        style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                        onPress={() => toggleTag(tag)}>
                        <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Additional Comments</Text>
            <TextInput style={styles.commentInput} value={comment} onChangeText={setComment}
                placeholder="Share more details..." placeholderTextColor="#666"
                multiline numberOfLines={4} textAlignVertical="top" />

            <TouchableOpacity style={styles.submitBtn} onPress={submitRating}>
                <Text style={styles.submitText}>Submit Rating</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    center: { justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 24, textAlign: 'center' },
    stars: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
    star: { fontSize: 44, color: '#333' },
    starActive: { color: '#ffb300' },
    ratingLabel: { color: '#aaa', textAlign: 'center', fontSize: 16, marginBottom: 24 },
    sectionTitle: { color: '#aaa', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 8 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    tag: { backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
    tagActive: { backgroundColor: '#1a73e8' },
    tagText: { color: '#aaa', fontSize: 13 },
    tagTextActive: { color: '#fff' },
    commentInput: { backgroundColor: '#1a1a1a', color: '#fff', padding: 14, borderRadius: 10, fontSize: 15, minHeight: 100, marginBottom: 24 },
    submitBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    checkmark: { fontSize: 64, color: '#00c853', marginBottom: 16 },
    thankYou: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    subtitle: { color: '#aaa', fontSize: 16, marginBottom: 32 },
    doneBtn: { backgroundColor: '#1a73e8', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
    doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
