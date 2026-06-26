import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  pill?: boolean;
}

export default function TabIcon({ name, focused, pill = false }: TabIconProps) {
  const { colors } = useTheme();

  const icon = (
    <Ionicons
      name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
      size={focused ? 26 : 24}
      color={focused ? colors.primaryGreen : colors.secondaryText}
    />
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.dot,
          { backgroundColor: colors.primaryGreen },
          focused ? styles.dotVisible : styles.dotHidden,
        ]}
      />
      {pill && focused ? (
        <View style={[styles.pill, { backgroundColor: colors.lightGreen }]}>{icon}</View>
      ) : (
        icon
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 3,
  },
  dotVisible: {
    opacity: 1,
  },
  dotHidden: {
    opacity: 0,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
});
