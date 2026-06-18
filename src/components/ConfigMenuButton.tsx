import { COLORS } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function ConfigMenuButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/config')}
      style={styles.trigger}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Settings size={26} color={COLORS.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    padding: 8,
  },
});
