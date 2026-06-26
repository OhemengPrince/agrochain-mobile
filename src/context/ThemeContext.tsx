import React, { createContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getTheme, saveTheme } from '../utils/storage';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  secondaryText: string;
  border: string;
  primaryGreen: string;
  primaryGreenDark: string;
  primaryGreenLight: string;
  lightGreen: string;
  accentAmber: string;
  lightAmber: string;
  white: string;
  errorRed: string;
  tabBarBackground: string;
  divider: string;
  inputBackground: string;
}

export const lightColors: ThemeColors = {
  background: '#F2F4F3',
  card: '#FFFFFF',
  text: '#1C1C1C',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  primaryGreen: '#1A6B2E',
  primaryGreenDark: '#124D21',
  primaryGreenLight: '#2E8B45',
  lightGreen: '#E8F5E9',
  accentAmber: '#FF8F00',
  lightAmber: '#FFF3E0',
  white: '#FFFFFF',
  errorRed: '#B71C1C',
  tabBarBackground: '#FFFFFF',
  divider: '#F0F0F0',
  inputBackground: '#F8F9FA',
};

export const darkColors: ThemeColors = {
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  secondaryText: '#9CA3AF',
  border: '#2C2C2C',
  primaryGreen: '#1A6B2E',
  primaryGreenDark: '#124D21',
  primaryGreenLight: '#2E8B45',
  lightGreen: '#1E2F22',
  accentAmber: '#FF8F00',
  lightAmber: '#332710',
  white: '#FFFFFF',
  errorRed: '#EF5350',
  tabBarBackground: '#1E1E1E',
  divider: '#2C2C2C',
  inputBackground: '#1E1E1E',
};

export interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: ThemeColors;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getTheme();
        setIsDarkMode(stored === 'dark');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      saveTheme(next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const value: ThemeContextValue = {
    isDarkMode,
    toggleDarkMode,
    colors: isDarkMode ? darkColors : lightColors,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
