import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

interface ErrorMessageProps {
  message?: string | null;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={18} color={colors.errorRed} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  icon: {
    marginRight: 8,
    marginTop: 1,
  },
  text: {
    flex: 1,
    color: colors.errorRed,
    fontSize: 13,
    fontWeight: '500',
  },
});
