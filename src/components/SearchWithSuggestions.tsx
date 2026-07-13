import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../context/ThemeContext';

interface Props<T extends Record<string, any>> {
  data: T[];
  keys: string[];
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion?: (item: T) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  barHeight?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: 'search' | 'done' | 'go' | 'next' | 'send';
}

function HighlightText({
  text,
  highlight,
  highlightColor,
  textColor,
}: {
  text: string;
  highlight: string;
  highlightColor: string;
  textColor: string;
}) {
  const trimmed = highlight.trim();
  if (!trimmed) return <Text style={{ color: textColor, fontSize: 14 }}>{text}</Text>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(trimmed.toLowerCase());
  if (idx === -1) return <Text style={{ color: textColor, fontSize: 14 }}>{text}</Text>;
  return (
    <Text style={{ color: textColor, fontSize: 14 }}>
      {text.slice(0, idx)}
      <Text style={{ color: highlightColor, fontWeight: '700' }}>
        {text.slice(idx, idx + trimmed.length)}
      </Text>
      {text.slice(idx + trimmed.length)}
    </Text>
  );
}

function SearchWithSuggestions<T extends Record<string, any>>(props: Props<T>) {
  const {
    data,
    keys,
    value,
    onChangeText,
    onSelectSuggestion,
    placeholder = 'Search...',
    icon = 'search',
    colors,
    containerStyle,
    barHeight = 52,
    onSubmitEditing,
    returnKeyType = 'search',
  } = props;

  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [dropdownMounted, setDropdownMounted] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    if (!value.trim() || !data.length) return [] as T[];
    const q = value.trim().toLowerCase();
    return data.filter((item) =>
      keys.some((k) => String(item[k] ?? '').toLowerCase().includes(q))
    );
  }, [data, keys, value]);

  const shouldShow = isFocused && value.trim().length > 0;

  useEffect(() => {
    if (shouldShow) {
      setDropdownMounted(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() =>
        setDropdownMounted(false)
      );
    }
  }, [shouldShow, fadeAnim]);

  const handleFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setIsFocused(false), 200);
  }, []);

  const handleSelect = useCallback(
    (item: T) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      onChangeText(String(item[keys[0]] ?? ''));
      onSelectSuggestion?.(item);
      setIsFocused(false);
    },
    [keys, onChangeText, onSelectSuggestion]
  );

  const handleClear = useCallback(() => {
    onChangeText('');
    setIsFocused(false);
  }, [onChangeText]);

  const displayed = suggestions.slice(0, 5);
  const extra = suggestions.length - 5;
  const noMatch = value.trim().length > 0 && suggestions.length === 0;

  return (
    <View style={[{ zIndex: 100 }, containerStyle]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.inputBackground,
            height: barHeight,
            borderRadius: Math.round(barHeight / 3),
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.secondaryText} style={styles.barIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {dropdownMounted && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              top: barHeight + 4,
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fadeAnim,
            },
          ]}
        >
          {noMatch ? (
            <View style={styles.noMatchRow}>
              <Ionicons name="search-outline" size={15} color={colors.secondaryText} />
              <Text style={[styles.noMatchText, { color: colors.secondaryText }]}>
                No results for "{value.trim()}"
              </Text>
            </View>
          ) : (
            <>
              {displayed.map((item, idx) => {
                const matchKey =
                  keys.find((k) =>
                    String(item[k] ?? '')
                      .toLowerCase()
                      .includes(value.toLowerCase().trim())
                  ) ?? keys[0];
                const displayText = String(item[matchKey] ?? '');
                const isLast = idx === displayed.length - 1 && extra <= 0;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.row,
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                      },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="search-outline" size={14} color={colors.secondaryText} style={styles.rowIcon} />
                    <View style={{ flex: 1 }}>
                      <HighlightText
                        text={displayText}
                        highlight={value}
                        highlightColor={colors.primaryGreen}
                        textColor={colors.text}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
              {extra > 0 && (
                <TouchableOpacity
                  style={[styles.seeAll, { borderTopColor: colors.border }]}
                  onPress={() => {
                    onSubmitEditing?.();
                    setIsFocused(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seeAllText, { color: colors.primaryGreen }]}>
                    See all {suggestions.length} results
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.primaryGreen} />
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}

export default SearchWithSuggestions;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  barIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowIcon: {
    marginRight: 10,
  },
  noMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  noMatchText: {
    fontSize: 14,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
