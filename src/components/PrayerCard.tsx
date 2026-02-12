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
  Sobh: 'sunny-outline',
  Chourouk: 'sunny',
  Dohr: 'sunny',
  Asr: 'partly-sunny-outline',
  Maghreb: 'cloudy-night-outline',
  Icha: 'moon-outline',
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
  const isSunrise = prayer.name === 'sunrise';
  const iconName = PRAYER_ICONS[prayer.nameFrench] || 'time-outline';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isPassed ? colors.surface + '80' : colors.surface },
        !isPassed && !isSunrise && Shadows.small,
        isSunrise && { opacity: 0.85 },
        isNext && { borderLeftWidth: 3, borderLeftColor: colors.primary },
        isPassed && !isSunrise && { borderLeftWidth: 3, borderLeftColor: colors.success + '40' },
        isSunrise && { borderLeftWidth: 3, borderLeftColor: colors.secondary + '60' },
        !isNext && !isPassed && !isSunrise && { borderLeftWidth: 3, borderLeftColor: 'transparent' },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isSunrise
              ? colors.secondary + '20'
              : isNext
                ? colors.primaryLight
                : isPassed
                  ? colors.success + '15'
                  : colors.separator,
          },
        ]}
      >
        <Ionicons
          name={isPassed && !isSunrise ? 'checkmark-circle' : iconName}
          size={20}
          color={isSunrise ? colors.secondary : isNext ? colors.primary : isPassed ? colors.success : colors.textSecondary}
        />
      </View>

      <View style={styles.nameCol}>
        <Text
          style={[
            isSunrise ? styles.sunriseName : styles.name,
            { color: isSunrise ? colors.secondary : isPassed ? colors.textMuted : colors.text },
            isPassed && !isSunrise && styles.passedText,
          ]}
        >
          {prayer.nameFrench}
        </Text>
        <Text
          style={[
            styles.arabic,
            { color: isSunrise ? colors.secondary + 'AA' : isPassed ? colors.textMuted : colors.textSecondary },
          ]}
        >
          {prayer.nameArabic}
        </Text>
      </View>

      <View style={styles.rightCol}>
        <Text
          style={[
            isSunrise ? styles.sunriseTime : styles.time,
            { color: isSunrise ? colors.secondary : isNext ? colors.primary : isPassed ? colors.textMuted : colors.text },
          ]}
        >
          {prayer.timeString}
        </Text>
        {isSunrise && (
          <Text style={[styles.passedLabel, { color: colors.secondary + 'AA' }]}>Lever du soleil</Text>
        )}
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
        {isPassed && !isSunrise && (
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
  sunriseName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
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
  sunriseTime: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
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
