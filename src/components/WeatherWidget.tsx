import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  ImageBackground,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

type ConditionGroup = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

const WEATHER_BACKGROUNDS: Record<ConditionGroup, ImageSourcePropType> = {
  clear: require('../assets/weather/sunny.jpg'),
  cloudy: require('../assets/weather/cloudy.jpg'),
  fog: require('../assets/weather/cloudy.jpg'),
  drizzle: require('../assets/weather/rainy.jpg'),
  rain: require('../assets/weather/rainy.jpg'),
  snow: require('../assets/weather/cloudy.jpg'),
  storm: require('../assets/weather/rainy.jpg'),
};

interface DailyForecast {
  day: string;
  icon: keyof typeof Ionicons.glyphMap;
  high: number;
  low: number;
  isToday: boolean;
}

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  group: ConditionGroup;
  locationLabel: string;
  daily: DailyForecast[];
}

type Status = 'loading' | 'ready' | 'unavailable';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CARD_WIDTH = Dimensions.get('window').width - 32;

// Maps WMO weather codes (returned by Open-Meteo) to a condition group and label.
function describeWeatherCode(code: number): { condition: string; group: ConditionGroup } {
  if (code === 0) return { condition: 'Clear Sky', group: 'clear' };
  if ([1, 2, 3].includes(code)) return { condition: 'Partly Cloudy', group: 'cloudy' };
  if ([45, 48].includes(code)) return { condition: 'Foggy', group: 'fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Light Drizzle', group: 'drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Heavy Rain', group: 'rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snowy', group: 'snow' };
  if ([95, 96, 99].includes(code)) return { condition: 'Storm with Heavy Rain', group: 'storm' };
  return { condition: 'Cloudy', group: 'cloudy' };
}

function iconForGroup(group: ConditionGroup): keyof typeof Ionicons.glyphMap {
  switch (group) {
    case 'clear': return 'sunny';
    case 'cloudy': return 'partly-sunny';
    case 'fog': return 'cloud-outline';
    case 'drizzle': return 'rainy-outline';
    case 'rain': return 'rainy';
    case 'snow': return 'snow';
    case 'storm': return 'thunderstorm';
  }
}

function describeText(group: ConditionGroup, windSpeed: number, humidity: number): string {
  switch (group) {
    case 'clear': return `Clear skies with light winds at ${windSpeed} km/h. Humidity sits at ${humidity}%.`;
    case 'cloudy': return `Partly cloudy with winds around ${windSpeed} km/h. Humidity near ${humidity}%.`;
    case 'fog': return `Reduced visibility from fog. Wind ${windSpeed} km/h, humidity ${humidity}%.`;
    case 'drizzle': return `Light drizzle expected through the day. Wind ${windSpeed} km/h, humidity ${humidity}%.`;
    case 'rain': return `Steady rain with wind around ${windSpeed} km/h. Humidity is high at ${humidity}%.`;
    case 'snow': return `Snowfall likely. Wind ${windSpeed} km/h, humidity ${humidity}%.`;
    case 'storm': return `Thunderstorms with heavy rain. Wind gusting to ${windSpeed} km/h.`;
  }
}

// ---------- Animated weather effect overlays ----------

function useLoop(duration: number, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    value.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [duration, delay]);
  return value;
}

function RainDrop({ index, intense }: { index: number; intense?: boolean }) {
  const progress = useLoop(intense ? 650 + (index % 5) * 60 : 1000 + (index % 5) * 90, (index % 7) * 140);
  const left = (index * 8.3) % 100;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-20, 170] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View
      style={[
        styles.rainDrop,
        { left: `${left}%`, opacity, transform: [{ translateY }, { rotate: '12deg' }] },
      ]}
    />
  );
}

function RainOverlay({ count = 18, intense }: { count?: number; intense?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <RainDrop key={i} index={i} intense={intense} />
      ))}
    </View>
  );
}

function SnowFlake({ index }: { index: number }) {
  const progress = useLoop(4200 + (index % 5) * 400, (index % 7) * 300);
  const left = (index * 9.5) % 100;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-20, 170] });
  const translateX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, 0] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View
      style={[styles.snowFlake, { left: `${left}%`, opacity, transform: [{ translateY }, { translateX }] }]}
    />
  );
}

function SnowOverlay() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {Array.from({ length: 14 }).map((_, i) => (
        <SnowFlake key={i} index={i} />
      ))}
    </View>
  );
}

function SunOverlay() {
  const pulse = useLoop(2400);
  const scale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 0.8, 0.45] });
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[styles.sunGlow, { transform: [{ scale }], opacity }]} />
    </View>
  );
}

function CloudShape({ index, speed }: { index: number; speed: number }) {
  const progress = useLoop(speed, index * 1300);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-70, CARD_WIDTH] });
  const top = 14 + index * 30;
  return (
    <Animated.View style={[styles.cloudShape, { top, transform: [{ translateX }] }]}>
      <Ionicons name="cloud" size={40 - index * 8} color="rgba(255,255,255,0.35)" />
    </Animated.View>
  );
}

function CloudsOverlay() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <CloudShape index={0} speed={9000} />
      <CloudShape index={1} speed={13000} />
    </View>
  );
}

function FogOverlay() {
  const pulse = useLoop(3200);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.35, 0.15] });
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[styles.fogLayer, { opacity }]} />
    </View>
  );
}

function StormFlash() {
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    const trigger = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        if (active) timeoutId = setTimeout(trigger, 1800 + Math.random() * 2500);
      });
    };
    timeoutId = setTimeout(trigger, 800);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);
  const opacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  return <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF', opacity }]} pointerEvents="none" />;
}

function WeatherEffects({ group }: { group: ConditionGroup }) {
  switch (group) {
    case 'rain':
      return (
        <>
          <RainOverlay count={22} intense />
        </>
      );
    case 'drizzle':
      return <RainOverlay count={12} />;
    case 'storm':
      return (
        <>
          <RainOverlay count={26} intense />
          <StormFlash />
        </>
      );
    case 'snow':
      return <SnowOverlay />;
    case 'clear':
      return <SunOverlay />;
    case 'cloudy':
      return <CloudsOverlay />;
    case 'fog':
      return <FogOverlay />;
    default:
      return null;
  }
}

// ---------- Main component ----------

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
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`
          ).then((res) => res.json()),
          Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []),
        ]);

        const current = weatherJson.current;
        const daily = weatherJson.daily;
        const { condition, group } = describeWeatherCode(current.weather_code);

        const dailyForecast: DailyForecast[] = daily.time.slice(0, 6).map((dateStr: string, index: number) => {
          const date = new Date(dateStr);
          const code = daily.weather_code[index];
          return {
            day: index === 0 ? 'Today' : DAY_LABELS[date.getDay()],
            icon: iconForGroup(describeWeatherCode(code).group),
            high: Math.round(daily.temperature_2m_max[index]),
            low: Math.round(daily.temperature_2m_min[index]),
            isToday: index === 0,
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
          group,
          description: describeText(group, Math.round(current.wind_speed_10m), Math.round(current.relative_humidity_2m)),
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
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (status === 'unavailable' || !weather) {
    return null;
  }

  return (
    <View style={styles.card}>
      <ImageBackground source={WEATHER_BACKGROUNDS[weather.group]} resizeMode="cover" style={styles.bgImage}>
        <WeatherEffects group={weather.group} />
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Weather Forecast</Text>
          </View>

          <View style={styles.headlineRow}>
            <View style={styles.headlineLeft}>
              <Text style={styles.headline}>{weather.condition}</Text>
              <Text style={styles.description} numberOfLines={3}>
                {weather.description}
              </Text>
            </View>

            <View style={styles.tempPanel}>
              <View style={styles.locationPill}>
                <Ionicons name="location" size={11} color="#FFFFFF" />
                <Text style={styles.locationPillText} numberOfLines={1}>
                  {weather.locationLabel}
                </Text>
              </View>
              <Text style={styles.bigTemp}>{weather.temp}°</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="speedometer-outline" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.metaText}>{weather.windSpeed}km/h</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="water-outline" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.metaText}>{weather.humidity}%</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastContent}
          >
            {weather.daily.map((day) => (
              <View key={day.day} style={[styles.forecastPill, day.isToday && styles.forecastPillActive]}>
                <Text style={styles.forecastDay}>{day.day}</Text>
                <Ionicons name={day.icon} size={18} color="#FFFFFF" style={styles.forecastIcon} />
                <Text style={styles.forecastTemp}>{day.high}°</Text>
                <Text style={styles.forecastTempLow}>{day.low}°</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    height: 240,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: '#37474F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  bgImage: {
    width: '100%',
  },
  content: {
    padding: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  headlineLeft: {
    flex: 1,
    paddingRight: 10,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    lineHeight: 17,
  },
  tempPanel: {
    alignItems: 'flex-end',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 110,
  },
  locationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bigTemp: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  forecastContent: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  forecastPill: {
    alignItems: 'center',
    width: 58,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  forecastPillActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  forecastDay: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  forecastIcon: {
    marginTop: 6,
  },
  forecastTemp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  forecastTempLow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  // weather effect particle styles
  rainDrop: {
    position: 'absolute',
    top: -20,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  snowFlake: {
    position: 'absolute',
    top: -10,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  sunGlow: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  cloudShape: {
    position: 'absolute',
    left: -70,
  },
  fogLayer: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
