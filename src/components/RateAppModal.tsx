import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';
import { getAppRating, setAppRating } from '../utils/storage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// AgroChain isn't published to the App Store / Play Store yet, so there's no
// real store listing to deep-link into and no backend endpoint to submit
// this to — this collects the rating locally on-device only.
export default function RateAppModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      getAppRating().then((r) => {
        if (r) { setStars(r.stars); setFeedback(r.feedback ?? ''); }
      });
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (stars === 0) {
      Alert.alert('Pick a rating', 'Tap a star to rate the app first.');
      return;
    }
    setSubmitting(true);
    try {
      await setAppRating({ stars, feedback: feedback.trim() || undefined, submittedAt: new Date().toISOString() });
      onClose();
      Alert.alert('Thanks!', 'Your feedback has been saved. AgroChain isn\'t on the App Store / Play Store yet, so this stays on your device for now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Rate AgroChain</Text>
          <Text style={styles.subtitle}>How's your experience with the app so far?</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                <Ionicons
                  name={n <= stars ? 'star' : 'star-outline'}
                  size={36}
                  color={n <= stars ? '#F59E0B' : colors.secondaryText}
                  style={{ marginHorizontal: 4 }}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.feedbackInput}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Tell us what you think (optional)"
            placeholderTextColor={colors.secondaryText}
            multiline
          />

          <Pressable onPress={handleSubmit} disabled={submitting}>
            <LinearGradient colors={[colors.primaryGreen, colors.primaryGreenLight]} style={[styles.submitButton, submitting && { opacity: 0.7 }]}>
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onClose} style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.secondaryText, fontWeight: '600' }}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: 24, padding: 24 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subtitle: { fontSize: 13, color: colors.secondaryText, textAlign: 'center', marginTop: 6 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 16 },
    feedbackInput: {
      minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.inputBackground, padding: 12, fontSize: 13, color: colors.text,
      textAlignVertical: 'top',
    },
    submitButton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    submitButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
