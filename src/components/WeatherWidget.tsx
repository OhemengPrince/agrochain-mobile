import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

interface DailyForecast {
  day: string;
  icon: keyof typeof Ionicons.glyphMap;
  high: number;
  low: number;
}

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  locationLabel: string;
  daily: DailyForecast[];
}

type Status = 'loading' | 'ready' | 'unavailable';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Maps WMO weather codes (returned by Open-Meteo) to a label, icon, and a
// gradient that visually reflects the actual condition.
function describeWeatherCode(code: number): { condition: string; icon: keyof typeof Ionicons.glyphMap; gradient: [string, string] } {
  if (code === 0) return { condition: 'Clear Sky', icon: 'sunny', gradient: ['#4FACFE', '#1E88E5'] };
  if ([1, 2, 3].includes(code)) return { condition: 'Partly Cloudy', icon: 'partly-sunny', gradient: ['#7FA6D6', '#52749C'] };
  if ([45, 48].includes(code)) return { condition: 'Foggy', icon: 'cloud-outline', gradient: ['#B0BEC5', '#78909C'] };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Drizzle', icon: 'rainy-outline', gradient: ['#5C9EAD', '#3A6073'] };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rainy', icon: 'rainy', gradient: ['#3A6073', '#16222A'] };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snowy', icon: 'snow', gradient: ['#83A4D4', '#5C7CA8'] };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', icon: 'thunderstorm', gradient: ['#373B44', '#4286F4'] };
  return { condition: 'Cloudy', icon: 'cloudy', gradient: ['#90A4AE', '#607D8B'] };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted') {
          if (isMounted) setStatus('unavailable');
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const { latitude, longitude } = position.coords;

        const [weatherJson, places] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`
          ).then((res) => res.json()),
          Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []),
        ]);

        const current = weatherJson.current;
        const daily = weatherJson.daily;
        const { condition, icon, gradient } = describeWeatherCode(current.weather_code);

        const dailyForecast: DailyForecast[] = daily.time.slice(1, 4).map((dateStr: string, index: number) => {
          const date = new Date(dateStr);
          const code = daily.weather_code[index + 1];
          return {
            day: DAY_LABELS[date.getDay()],
            icon: describeWeatherCode(code).icon,
            high: Math.round(daily.temperature_2m_max[index + 1]),
            low: Math.round(daily.temperature_2m_min[index + 1]),
          };
        });

        const place = places?.[0];
        const locationLabel = place?.city || place?.subregion || place?.region || 'Your Location';

        if (!isMounted) return;
        setWeather({
          temp: Math.round(current.temperature_2m),
          humidity: Math.round(current.relative_humidity_2m),
          windSpeed: Math.round(current.wind_speed_10m),
          condition,
          icon,
          gradient,
          locationLabel,
          daily: dailyForecast,
        });
        setStatus('ready');
      } catch {
        if (isMounted) setStatus('unavailable');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color="#1A6B2E" />
      </View>
    );
  }

  if (status === 'unavailable' || !weather) {
    return null;
  }

  return (
    <LinearGradient colors={weather.gradient} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.location} numberOfLines={1}>{weather.locationLabel}</Text>
          <Text style={styles.condition}>{weather.condition}</Text>
        </View>
        <Ionicons name={weather.icon} size={42} color="#FFFFFF" />
      </View>

      <Text style={styles.temp}>{weather.temp}°C</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="water-outline" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.metaText}>{weather.humidity}%</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="speedometer-outline" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.metaText}>{weather.windSpeed} km/h</Text>
        </View>
      </View>

      {weather.daily.length > 0 && (
        <View style={styles.forecastRow}>
          {weather.daily.map((day) => (
            <View key={day.day} style={styles.forecastItem}>
              <Text style={styles.forecastDay}>{day.day}</Text>
              <Ionicons name={day.icon} size={18} color="#FFFFFF" />
              <Text style={styles.forecastTemp}>
                {day.high}°/{day.low}°
              </Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    height: 100,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#F0F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: {
    flexShrink: 1,
  },
  location: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  condition: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  temp: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  forecastItem: {
    alignItems: 'center',
    gap: 4,
  },
  forecastDay: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  forecastTemp: {
    fontSize: 11,
    color: '#FFFFFF',
  },
});
