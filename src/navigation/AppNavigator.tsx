/**
 * Navigation principale de l'application
 * Bottom Tab Navigator avec 5 onglets
 * Optimisé pour mobile avec gestion SafeArea et centrage parfait
 */

import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';
import {
  HomeScreen,
  CoranScreen,
  PrieresScreen,
  RamadanScreen,
} from '../screens';
import { DuaNavigator } from './DuaNavigator';
import { CircleNavigator } from './CircleNavigator';

// Types pour la navigation
export type RootTabParamList = {
  Home: undefined;
  Coran: undefined;
  Prieres: undefined;
  Cercle: undefined;
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
  Cercle: { focused: 'people', unfocused: 'people-outline' },
  Dua: { focused: 'hand-left', unfocused: 'hand-left-outline' },
};

// Labels français pour les onglets
const tabLabels: Record<keyof RootTabParamList, string> = {
  Home: 'Accueil',
  Coran: 'Coran',
  Prieres: 'Prières',
  Cercle: 'Cercle',
  Dua: 'Dua',
};

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Hauteur de la TabBar avec safe area
  const tabBarHeight = Math.max(56, 48 + insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const iconConfig = tabIcons[route.name];
          const iconName = focused ? iconConfig.focused : iconConfig.unfocused;
          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={24} color={color} />
            </View>
          );
        },
        tabBarLabel: tabLabels[route.name],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 4,
          paddingTop: 4,
          // Pas de paddingHorizontal pour laisser les items se répartir
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          textAlign: 'center',
        },
        tabBarItemStyle: {
          flex: 1, // Répartition égale des 5 onglets
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          alignSelf: 'center',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Coran" component={CoranScreen} />
      <Tab.Screen name="Prieres" component={PrieresScreen} />
      <Tab.Screen name="Cercle" component={CircleNavigator} />
      <Tab.Screen name="Dua" component={DuaNavigator} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 28,
  },
});

export default AppNavigator;
