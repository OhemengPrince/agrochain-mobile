import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../context/ThemeContext';

export interface SettingsRowItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  badge?: string;
}

export interface SettingsSection {
  title: string;
  items: SettingsRowItem[];
}

function Row({
  item,
  isLast,
  styles,
  colors,
}: {
  item: SettingsRowItem;
  isLast: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <>
      <Pressable style={styles.row} onPress={item.onPress} disabled={!item.onPress}>
        <View style={[styles.rowIconCircle, item.destructive && styles.rowIconCircleDestructive]}>
          <Ionicons name={item.icon} size={18} color={item.destructive ? colors.errorRed : colors.primaryGreen} />
        </View>
        <Text style={[styles.rowLabel, item.destructive && styles.rowLabelDestructive]}>{item.label}</Text>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <View style={styles.rowRight}>{item.right ?? <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />}</View>
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

// Categorized settings list rendered directly beneath the profile header
// (as a Profile-screen tab) instead of a small popup dropdown.
export default function ProfileSettingsList({ sections }: { sections: SettingsSection[] }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {sections.map((section) => (
        <View key={section.title} style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, i) => (
              <Row key={item.label} item={item} isLast={i === section.items.length - 1} styles={styles} colors={colors} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, marginTop: 16, gap: 22 },
    sectionWrap: {},
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.secondaryText,
      letterSpacing: 1.2,
      marginBottom: 8,
      marginLeft: 4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.divider,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingHorizontal: 14,
      gap: 12,
    },
    rowIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconCircleDestructive: {
      backgroundColor: `${colors.errorRed}1A`,
    },
    rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    rowLabelDestructive: { color: colors.errorRed },
    rowRight: { marginLeft: 4 },
    badge: {
      backgroundColor: colors.accentAmber,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginRight: 6,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    divider: { height: 1, backgroundColor: colors.divider, marginLeft: 62 },
  });
}
