import { COLORS } from '@/constants/Colors';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

interface Action {
  label: string;
  onPress: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
}

interface ModernModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  primaryAction?: Action;
  secondaryAction?: Action;
  children?: React.ReactNode;
  centered?: boolean;
}

export default function ModernModal({
  visible,
  onClose,
  title,
  icon,
  primaryAction,
  secondaryAction,
  children,
  centered,
}: ModernModalProps) {
  const inner = (
    <>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {children && <View style={styles.body}>{children}</View>}
      <View style={styles.actions}>
        {primaryAction && (
          <TouchableOpacity
            style={[styles.button, primaryAction.destructive ? styles.destructiveButton : styles.primaryButton]}
            onPress={primaryAction.onPress}
            disabled={primaryAction.loading}
            activeOpacity={0.8}>
            {primaryAction.loading
              ? <ActivityIndicator color={COLORS.white} size={18} />
              : <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>}
          </TouchableOpacity>
        )}
        {secondaryAction && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={secondaryAction.onPress}
            disabled={secondaryAction.loading}
            activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {centered ? (
        <View style={styles.overlayCentered}>
          <View style={styles.backdrop} onTouchEnd={onClose} />
          <View style={styles.sheetCentered}>{inner}</View>
        </View>
      ) : (
        <View style={styles.overlay}>
          <View style={styles.backdrop} onTouchEnd={onClose} />
          <View style={styles.sheet}>{inner}</View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetCentered: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  iconContainer: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textDark, textAlign: 'center', marginBottom: 12 },
  body: { width: '100%', marginBottom: 20 },
  actions: { width: '100%', gap: 10 },
  button: { width: '100%', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primaryButton: { backgroundColor: COLORS.mediumBlue },
  destructiveButton: { backgroundColor: COLORS.error },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  secondaryButton: { width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.borderGray },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textMedium },
});
