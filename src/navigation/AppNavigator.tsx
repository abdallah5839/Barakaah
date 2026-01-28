/**
 * Navigation principale de l'application
 * Bottom Tab Navigator avec 5 onglets
 */

import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';
import {
  HomeScreen,
  CoranScreen,
  PrieresScreen,
  RamadanScreen,
} from '../screens';
import { DuaNavigator } from './DuaNavigator';

// Types pour la navigation
export type RootTabParamList = {
  Home: undefined;
  Coran: undefined;
  Prieres: undefined;
  Ramadan: undefined;
  Dua: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Configuration des icônes pour chaque onglet
type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconConfig {
  focused: IconName;
  unfocused: IconName;
}

const tabIcons: Record<keyof RootTabParamList, TabIconConfig> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Coran: { focused: 'book', unfocused: 'book-outline' },
  Prieres: { focused: 'time', unfocused: 'time-outline' },
  Ramadan: { focused: 'moon', unfocused: 'moon-outline' },
  Dua: { focused: 'hand-left', unfocused: 'hand-left-outline' },
};

// Labels français pour les onglets
const tabLabels: Record<keyof RootTabParamList, string> = {
  Home: 'Accueil',
  Coran: 'Coran',
  Prieres: 'Prières',
  Ramadan: 'Ramadan',
  Dua: 'Dua',
};

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconConfig = tabIcons[route.name];
          const iconName = focused ? iconConfig.focused : iconConfig.unfocused;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabel: tabLabels[route.name],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Coran" component={CoranScreen} />
      <Tab.Screen name="Prieres" component={PrieresScreen} />
      <Tab.Screen name="Ramadan" component={RamadanScreen} />
      <Tab.Screen name="Dua" component={DuaNavigator} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  tabBarLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginBottom: Platform.OS === 'ios' ? 0 : Spacing.xs,
  },
  tabBarItem: {
    paddingVertical: Spacing.xs,
  },
});

export default AppNavigator;
