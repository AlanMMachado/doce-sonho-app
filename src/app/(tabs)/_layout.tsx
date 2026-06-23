import { COLORS } from '@/constants/Colors';
import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, FileSpreadsheet, Package, Users } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

function TabIcon({ color, focused, Icon }: { color: string; focused: boolean; Icon: React.ComponentType<any> }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: focused ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const iconSize = Platform.OS === 'android' ? 24 : 28;

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
        <Icon width={iconSize} height={iconSize} color={focused ? color : COLORS.gray} />
      </Animated.View>
    </View>
  );
}

function renderLabel(label: string) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <View style={styles.labelContainer}>
      <Text style={[styles.iconLabel, { color: focused ? color : COLORS.textLight }]} allowFontScaling={false}>
        {label}
      </Text>
      <View style={[styles.labelIndicator, { width: focused ? 26 : 0, backgroundColor: focused ? color : 'transparent' }]} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.mediumBlue,
        tabBarInactiveTintColor: COLORS.textLight,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderGray,
          paddingTop: Platform.OS === 'ios' ? 14 : 10,
          paddingBottom: Platform.OS === 'ios' ? 16 : 18,
          minHeight: Platform.OS === 'ios' ? 84 : 92,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarShowLabel: true,
        tabBarIconStyle: { marginTop: 5, alignItems: 'center', justifyContent: 'center' },
      }}>

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarLabel: renderLabel('Dashboard'),
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} Icon={ChartNoAxesColumnIncreasing} />,
        }}
      />

      <Tabs.Screen
        name="remessas"
        options={{
          title: 'Remessas',
          headerShown: false,
          tabBarLabel: renderLabel('Remessas'),
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} Icon={Package} />,
        }}
      />

      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          headerShown: false,
          tabBarLabel: renderLabel('Clientes'),
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} Icon={Users} />,
        }}
      />

      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          headerShown: false,
          tabBarLabel: renderLabel('Relatórios'),
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} Icon={FileSpreadsheet} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 0,
    textAlign: 'center',
    color: COLORS.textMedium,
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  labelIndicator: {
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
    alignSelf: 'center',
    minWidth: 28,
  },
});
