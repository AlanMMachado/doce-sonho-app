import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TextInput, TextInputProps } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface ModernInputProps extends TextInputProps {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
  isValid?: boolean;
  error?: boolean;
}

export default function ModernInput({
  icon,
  rightIcon,
  style,
  isRequired = false,
  isValid = true,
  error = false,
  ...props
}: ModernInputProps) {
  const showError = (isRequired && !isValid) || error;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(translateX, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [error]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
      {icon && <Animated.View style={styles.iconContainer}>{icon}</Animated.View>}
      <TextInput
        style={[
          styles.input,
          icon ? styles.inputWithIcon : null,
          rightIcon ? styles.inputWithRightIcon : null,
          showError && styles.inputError,
          style
        ]}
        placeholderTextColor={COLORS.gray}
        {...props}
      />
      {rightIcon && <Animated.View style={styles.rightIconContainer}>{rightIcon}</Animated.View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    color: COLORS.darkGray,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  inputWithRightIcon: {
    paddingRight: 48,
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  iconTouchable: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
