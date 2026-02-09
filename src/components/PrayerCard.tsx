/**
 * PrayerCard — Carte individuelle de prière avec design luxueux
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import type { Prayer } from '../hooks';

const PRAYER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Fajr: 'sunny-outline',
  'Lever du soleil': 'sunny',
  Dhuhr: 'sunny',
  Asr: 'partly-sunny-outline',
  Maghrib: 'cloudy-night-outline',
  Isha: 'moon-outline',
};

interface PrayerCardProps {
  prayer: Prayer;
  countdown?: string;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  countdown,
}) => {
  const { colors } = useTheme();
  const { isPassed, isNext } = prayer;
  const iconName = PRAYER_ICONS[prayer.nameFrench] || 'time-outline';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isPassed ? colors.surface + '80' : colors.surface },
        !isPassed && Shadows.small,
        isNext && { borderLeftWidth: 3, borderLeftColor: colors.primary },
        isPassed && { borderLeftWidth: 3, borderLeftColor: colors.success + '40' },
        !isNext && !isPassed && { borderLeftWidth: 3, borderLeftColor: 'transparent' },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isNext
              ? colors.primaryLight
              : isPassed
                ? colors.success + '15'
                : colors.separator,
          },
        ]}
      >
        <Ionicons
          name={isPassed ? 'checkmark-circle' : iconName}
          size={20}
          color={isNext ? colors.primary : isPassed ? colors.success : colors.textSecondary}
        />
      </View>

      <View style={styles.nameCol}>
        <Text
          style={[
            styles.name,
            { color: isPassed ? colors.textMuted : colors.text },
            isPassed && styles.passedText,
          ]}
        >
          {prayer.nameFrench}
        </Text>
        <Text
          style={[
            styles.arabic,
            { color: isPassed ? colors.textMuted : colors.textSecondary },
          ]}
        >
          {prayer.nameArabic}
        </Text>
      </View>

      <View style={styles.rightCol}>
        <Text
          style={[
            styles.time,
            { color: isNext ? colors.primary : isPassed ? colors.textMuted : colors.text },
          ]}
        >
          {prayer.timeString}
        </Text>
        {isNext && countdown && (
          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              Dans {countdown}
            </Text>
          </View>
        )}
        {isNext && !countdown && (
          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Prochaine</Text>
          </View>
        )}
        {isPassed && (
          <Text style={[styles.passedLabel, { color: colors.success }]}>Terminée</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  passedText: {
    textDecorationLine: 'line-through',
  },
  arabic: {
    fontSize: Typography.sizes.sm,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Spacing.radiusFull,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  passedLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default PrayerCard;
