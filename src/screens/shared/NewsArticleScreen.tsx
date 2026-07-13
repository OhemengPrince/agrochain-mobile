import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  navigation: any;
  route: { params: { url: string; title: string } };
};

export default function NewsArticleScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { url, title } = route.params;

  const [progress, setProgress] = useState(0);
  const [loadDone, setLoadDone] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handleProgress = (p: number) => {
    setProgress(p);
    Animated.timing(progressAnim, {
      toValue: p,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message: Platform.OS === 'android' ? `${title}\n${url}` : title,
        url,
      } as any);
    } catch {}
  };

  const openInBrowser = () => {
    if (url) Linking.openURL(url);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.primaryGreen }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primaryGreen, colors.primaryGreenLight]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          AgroChain News
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={openInBrowser}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Progress bar */}
      {!loadDone && !loadError && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressBar, { width: progressWidth, backgroundColor: colors.primaryGreen }]}
          />
        </View>
      )}

      {/* Error state */}
      {loadError ? (
        <View style={[styles.errorBox, { backgroundColor: colors.background }]}>
          <Ionicons name="wifi-off-outline" size={56} color={colors.secondaryText} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Could not load article</Text>
          <Text style={[styles.errorSub, { color: colors.secondaryText }]}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.openBrowserBtn, { backgroundColor: colors.primaryGreen }]}
            onPress={openInBrowser}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={16} color="#fff" />
            <Text style={styles.openBrowserText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={[styles.webview, { backgroundColor: colors.background }]}
          onLoadProgress={({ nativeEvent }) => handleProgress(nativeEvent.progress)}
          onLoad={() => {
            handleProgress(1);
            setLoadDone(true);
          }}
          onError={() => setLoadError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 400) setLoadError(true);
          }}
          allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginHorizontal: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(26,107,46,0.15)',
    width: '100%',
  },
  progressBar: {
    height: 3,
  },
  webview: {
    flex: 1,
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  openBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  openBrowserText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
