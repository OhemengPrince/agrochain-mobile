import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface ProfileTabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function ProfileTabs({ tabs, activeTab, onChange }: ProfileTabsProps) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = tab === activeTab;
        return (
          <Pressable key={tab} style={[styles.tab, active && styles.tabActive]} onPress={() => onChange(tab)}>
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#1C1C1C',
    fontWeight: '700',
  },
});
