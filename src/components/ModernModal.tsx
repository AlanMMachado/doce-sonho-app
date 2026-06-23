import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import ModernButton from './ModernButton';

interface ModernModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

const TYPE_CONFIG = {
  success: {
    color: COLORS.success,
    Icon: CheckCircle,
  },
  error: {
    color: COLORS.error,
    Icon: XCircle,
  },
  warning: {
    color: COLORS.warning,
    Icon: AlertTriangle,
  },
  info: {
    color: COLORS.mediumBlue,
    Icon: Info,
  },
};

export default function ModernModal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  primaryButtonText = 'Entendi',
  secondaryButtonText,
  onSecondaryPress,
}: ModernModalProps) {
  const config = TYPE_CONFIG[type];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { borderTopColor: config.color }]}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '18' }]}>
            <config.Icon width={32} height={32} color={config.color} />
          </View>

          <Text style={[styles.modalTitle, { color: config.color }]}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          <View style={styles.separator} />

          <View style={styles.buttonContainer}>
            <ModernButton
              title={primaryButtonText}
              onPress={onClose}
              style={styles.primaryButton}
            />
            {secondaryButtonText && onSecondaryPress && (
              <ModernButton
                title={secondaryButtonText}
                variant="secondary"
                onPress={onSecondaryPress}
                style={styles.secondaryButton}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 30, 63, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 4,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
});