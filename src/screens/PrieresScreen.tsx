/**
 * Écran Prières — Horaires de prière avec design luxueux
 * Header avec dôme/mosquée, date hijri dorée, icônes uniques par prière
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import { formatDateFrench, getHijriDate } from '../utils';
import { usePrayerTimes } from '../hooks';
import { NextPrayerCard, PrayerCard } from '../components';

export const PrieresScreen: React.FC = () => {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    prayers,
    nextPrayer,
    countdown,
    countdownString,
    currentTimeAbidjan,
    refresh,
  } = usePrayerTimes();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const passedCount = prayers.filter(p => p.isPassed).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="home" size={22} color={colors.secondary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Horaires de Prière
              </Text>
            </View>
            <Pressable onPress={refresh} style={[styles.refreshBtn, { backgroundColor: colors.surface }]} hitSlop={8}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.headerDateRow}>
            <Text style={[styles.dateGregorian, { color: colors.textSecondary }]}>
              {formatDateFrench()}
            </Text>
            <View style={[styles.hijriBadge, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="moon" size={12} color={colors.secondary} style={{ marginRight: 4 }} />
              <Text style={[styles.hijriText, { color: colors.secondary }]}>
                {getHijriDate()}
              </Text>
            </View>
          </View>
          <Text style={[styles.currentTime, { color: colors.primary }]}>
            {currentTimeAbidjan}
          </Text>
        </View>

        {/* ===== NEXT PRAYER CARD ===== */}
        <NextPrayerCard
          prayer={nextPrayer}
          countdown={countdown}
          countdownString={countdownString}
        />

        {/* ===== PROGRESS ===== */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Horaires du jour
            </Text>
            <View style={[styles.progressBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.progressBadgeText, { color: colors.primary }]}>
                {passedCount}/5
              </Text>
            </View>
          </View>

          {/* Progress bar with gold fill */}
          <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
            <LinearGradient
              colors={[colors.primary, colors.secondary] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${(passedCount / 5) * 100}%` as any }]}
            />
          </View>
        </View>

        {/* ===== PRAYER LIST ===== */}
        <View style={styles.prayersList}>
          {prayers.map((prayer) => (
            <PrayerCard
              key={prayer.name}
              prayer={prayer}
              countdown={prayer.isNext ? countdownString : undefined}
            />
          ))}
        </View>

        {/* ===== NOTE ===== */}
        <View style={[styles.noteCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Horaires calculés selon la méthode Jafari (Téhéran).
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // --- Header ---
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  dateGregorian: {
    fontSize: Typography.sizes.sm,
  },
  hijriBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.radiusFull,
  },
  hijriText: {
    fontSize: 11,
    fontWeight: '600',
  },
  currentTime: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },

  // --- Progress ---
  progressSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.radiusFull,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // --- Prayers list ---
  prayersList: {
    paddingHorizontal: Spacing.screenHorizontal,
  },

  // --- Note ---
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
  },
  noteText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.sizes.xs * 1.5,
  },

  // --- Bottom ---
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default PrieresScreen;
