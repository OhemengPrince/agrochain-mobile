import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingTabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

export default React.memo(function FloatingTabIcon({ name, label, focused }: FloatingTabIconProps) {
  const iconName = focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap);

  return (
    <View style={[styles.tab, focused && styles.tabActive]}>
      <Ionicons name={iconName} size={focused ? 24 : 22} color={focused ? '#1A6B2E' : '#9CA3AF'} />
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 24,
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  labelActive: {
    color: '#1A6B2E',
    fontWeight: '700',
  },
});
