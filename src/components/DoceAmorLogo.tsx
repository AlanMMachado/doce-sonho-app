import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

interface DoceAmorLogoProps {
  size?: number;
  style?: ViewStyle;
}

export default function DoceAmorLogo({ size = 40, style }: DoceAmorLogoProps) {
  return (
    <View style={[styles.container, style]}>
      <Image 
        source={require('../../assets/images/icon.png')}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logo: {
  },
});