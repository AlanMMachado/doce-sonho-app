import { COLORS } from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  width?: string | number;
  height?: number;
  style?: ViewStyle;
}

interface SkeletonCardProps {
  lines?: number;
  hasProgressBar?: boolean;
  style?: ViewStyle;
}

export function SkeletonBlock({ width = '100%', height = 12, style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: COLORS.borderGray,
          borderRadius: 4,
          opacity,
        } as any,
        style,
      ]}
    />
  );
}

export default function SkeletonCard({ lines = 3, hasProgressBar = false, style }: SkeletonCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.borderGray,
          padding: 16,
          marginBottom: 12,
        },
        style,
      ]}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i}>
          <SkeletonBlock
            width={i === lines - 1 ? '70%' : '100%'}
            height={i === 0 ? 16 : 12}
            style={{ marginBottom: 8 }}
          />
          {hasProgressBar && i === 0 && (
            <SkeletonBlock width="100%" height={8} style={{ marginBottom: 8, borderRadius: 4 }} />
          )}
        </View>
      ))}
    </View>
  );
}
