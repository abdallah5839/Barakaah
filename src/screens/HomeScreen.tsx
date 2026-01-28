/**
 * Écran Home (Accueil)
 * Dashboard principal de l'application Barakaah
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows, APP_NAME } from '../constants';
import { formatDateFrench, getHijriDate } from '../utils';
import { usePrayerTimes } from '../hooks';
import { Card, NextPrayerCard, QuickAccessCard } from '../components';
import { getDuaOfTheDay } from '../data';

// Type pour la navigation
type RootTabParamList = {
  Home: undefined;
  Coran: undefined;
  Prieres: undefined;
  Ramadan: undefined;
  Dua: undefined;
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  // Utiliser le hook pour les horaires de prière (mise à jour chaque seconde)
  const {
    nextPrayer,
    countdown,
    countdownString,
    currentTimeAbidjan,
    refresh,
  } = usePrayerTimes();

  // Dua du jour (basée sur la date)
  const duaOfTheDay = useMemo(() => getDuaOfTheDay(), []);

  // Rafraîchir les données
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Verset du jour (placeholder)
  const verseOfTheDay = {
    text: '"Et c\'est vers Allah que se fait le retour final."',
    reference: 'Sourate Al-Baqarah, Verset 285',
  };

  // Navigation vers l'onglet Dua
  const goToDuaTab = () => {
    navigation.navigate('Dua');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.appName, { color: colors.text }]}>{APP_NAME}</Text>
            <Text style={[styles.currentTime, { color: colors.textSecondary }]}>
              {currentTimeAbidjan}
            </Text>
          </View>
          <Pressable onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={26}
              color={colors.text}
            />
          </Pressable>
        </View>

        {/* Card prochaine prière avec countdown temps réel */}
        <NextPrayerCard
          prayer={nextPrayer}
          countdown={countdown}
          countdownString={countdownString}
        />

        {/* Date du jour */}
        <Card style={styles.dateCard}>
          <View style={styles.dateContainer}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary}
              style={styles.dateIcon}
            />
            <View>
              <Text style={[styles.dateGregorian, { color: colors.text }]}>
                {formatDateFrench()}
              </Text>
              <Text style={[styles.dateHijri, { color: colors.secondary }]}>
                {getHijriDate()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Dua du jour */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dua du jour
            </Text>
            <Pressable onPress={goToDuaTab}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Voir tout
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={goToDuaTab}
            style={({ pressed }) => [
              styles.duaCard,
              { backgroundColor: colors.surface },
              Shadows.small,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.duaCardContent}>
              <View style={[styles.duaIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="hand-left" size={24} color={colors.primary} />
              </View>
              <View style={styles.duaInfo}>
                <Text style={[styles.duaArabicName, { color: colors.text }]}>
                  {duaOfTheDay.arabicName}
                </Text>
                <Text style={[styles.duaFrenchName, { color: colors.text }]}>
                  {duaOfTheDay.frenchName}
                </Text>
                <Text style={[styles.duaOccasion, { color: colors.textSecondary }]}>
                  {duaOfTheDay.occasion}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* Verset du jour */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Verset du jour
          </Text>
          <Card variant="outlined">
            <Text style={[styles.verseText, { color: colors.text }]}>
              {verseOfTheDay.text}
            </Text>
            <Text style={[styles.verseReference, { color: colors.textSecondary }]}>
              {verseOfTheDay.reference}
            </Text>
          </Card>
        </View>

        {/* Accès rapides */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accès rapides
          </Text>
          <View style={styles.quickAccessGrid}>
            <View style={styles.quickAccessRow}>
              <QuickAccessCard
                icon="book-outline"
                label="Coran"
                onPress={() => navigation.navigate('Coran')}
              />
              <QuickAccessCard
                icon="time-outline"
                label="Prières"
                onPress={() => navigation.navigate('Prieres')}
              />
            </View>
            <View style={styles.quickAccessRow}>
              <QuickAccessCard
                icon="moon-outline"
                label="Ramadan"
                onPress={() => navigation.navigate('Ramadan')}
              />
              <QuickAccessCard
                icon="hand-left-outline"
                label="Dua"
                onPress={() => navigation.navigate('Dua')}
              />
            </View>
          </View>
        </View>

        {/* Espacement en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  currentTime: {
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
  },
  themeButton: {
    padding: Spacing.sm,
  },
  dateCard: {
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: Spacing.md,
  },
  dateGregorian: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  dateHijri: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.md,
  },
  duaCard: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
  },
  duaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  duaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaInfo: {
    flex: 1,
  },
  duaArabicName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  duaFrenchName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  duaOccasion: {
    fontSize: Typography.sizes.sm,
  },
  verseText: {
    fontSize: Typography.sizes.md,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.md * 1.6,
    marginBottom: Spacing.sm,
  },
  verseReference: {
    fontSize: Typography.sizes.sm,
    textAlign: 'right',
  },
  quickAccessGrid: {
    marginTop: Spacing.xs,
  },
  quickAccessRow: {
    flexDirection: 'row',
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default HomeScreen;
