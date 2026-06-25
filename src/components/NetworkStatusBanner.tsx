import { COLORS } from '@/constants/Colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const BANNER_HEIGHT = 36;

export default function NetworkStatusBanner() {
  const { isConnected, justReconnected } = useNetworkStatus();
  const heightAnim = useRef(new Animated.Value(0)).current;
  const visible = !isConnected || justReconnected;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: visible ? BANNER_HEIGHT : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [visible, heightAnim]);

  const backgroundColor = isConnected ? COLORS.success : COLORS.error;
  const message = isConnected ? 'Você está online' : 'Você está offline';
  const Icon = isConnected ? Wifi : WifiOff;

  return (
    <Animated.View style={[styles.container, { height: heightAnim, backgroundColor }]}>
      <View style={styles.content}>
        <Icon size={14} color={COLORS.white} strokeWidth={2.5} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  text: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
