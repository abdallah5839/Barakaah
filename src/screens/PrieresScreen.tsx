/**
 * Écran Prières (Horaires)
 * Affiche les horaires de prière pour la journée
 * Avec countdown temps réel et marquage des prières passées
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, DEFAULT_COORDINATES } from '../constants';
import { formatDateFrench } from '../utils';
import { usePrayerTimes } from '../hooks';
import { NextPrayerCard, PrayerCard } from '../components';

export const PrieresScreen: React.FC = () => {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [city] = useState(DEFAULT_COORDINATES.city);

  // Utiliser le hook pour les horaires de prière (mise à jour chaque seconde)
  const {
    prayers,
    nextPrayer,
    countdown,
    countdownString,
    currentTimeAbidjan,
    refresh,
  } = usePrayerTimes();

  // Rafraîchir les données
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Compter les prières passées
  const passedCount = prayers.filter(p => p.isPassed).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header avec ville et date */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={22} color={colors.primary} />
            <Text style={[styles.cityName, { color: colors.text }]}>{city}</Text>
            <Pressable style={styles.locationButton} onPress={refresh}>
              <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.dateRow}>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDateFrench()}
            </Text>
            <Text style={[styles.currentTime, { color: colors.primary }]}>
              {currentTimeAbidjan}
            </Text>
          </View>
        </View>

        {/* Card prochaine prière avec countdown temps réel */}
        <NextPrayerCard
          prayer={nextPrayer}
          countdown={countdown}
          countdownString={countdownString}
        />

        {/* Section titre avec compteur */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Horaires du jour
            </Text>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {passedCount}/5 prières accomplies
            </Text>
          </View>
          <Text style={[styles.methodInfo, { color: colors.textSecondary }]}>
            Méthode Jafari
          </Text>
        </View>

        {/* Barre de progression des prières */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.success,
                  width: `${(passedCount / 5) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Liste des prières */}
        <View style={styles.prayersList}>
          {prayers.map((prayer) => (
            <PrayerCard
              key={prayer.name}
              prayer={prayer}
              countdown={prayer.isNext ? countdownString : undefined}
            />
          ))}
        </View>

        {/* Note informative */}
        <View style={styles.noteContainer}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Les horaires sont calculés selon la méthode de calcul Jafari (Téhéran)
            utilisée par la majorité des musulmans chiites.
          </Text>
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
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cityName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  locationButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: Spacing['3xl'],
  },
  date: {
    fontSize: Typography.sizes.sm,
  },
  currentTime: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  methodInfo: {
    fontSize: Typography.sizes.xs,
  },
  progressBarContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  prayersList: {
    paddingHorizontal: Spacing.screenHorizontal,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default PrieresScreen;
