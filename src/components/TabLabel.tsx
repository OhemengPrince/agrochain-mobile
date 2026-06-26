import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface TabLabelProps {
  label: string;
  focused: boolean;
}

export default function TabLabel({ label, focused }: TabLabelProps) {
  const { colors } = useTheme();

  const activeStyle: TextStyle = { color: colors.primaryGreen, fontWeight: '700' };
  const inactiveStyle: TextStyle = { color: colors.secondaryText, fontWeight: '500', opacity: 0.6 };

  return (
    <Text style={[styles.label, focused ? activeStyle : inactiveStyle]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});
