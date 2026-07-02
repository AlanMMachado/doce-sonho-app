import { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function MetricCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, { borderLeftColor: COLORS.borderGray }, style]}>
      <View style={styles.header}>
        <SkeletonBlock width={16} height={16} style={{ borderRadius: 8 }} />
        <SkeletonBlock width="55%" height={12} />
      </View>
      <SkeletonBlock width="60%" height={20} style={{ marginBottom: 4 }} />
      <SkeletonBlock width="40%" height={11} />
    </View>
  );
}

export default function MetricCard({ icon, label, value, color, subtitle, style }: MetricCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }, style]}>
      <View style={styles.header}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderLeftWidth: 2,
    padding: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textLight,
  },
});
